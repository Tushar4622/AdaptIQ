import base64
import hmac
import io
import os
from typing import Annotated

import mediapipe as mp
import numpy as np
from deepface import DeepFace
from fastapi import FastAPI, Header, HTTPException
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

MODEL_NAME = "Facenet512"
MODEL_VERSION = f"deepface:{MODEL_NAME};mediapipe:{mp.__version__}"
API_TOKEN = os.environ.get("FACE_VERIFIER_API_TOKEN", "").strip()
MAX_IMAGE_BYTES = 1_000_000
app = FastAPI(title="AdaptIQ Face Verifier", docs_url=None, redoc_url=None)


class EnrollmentRequest(BaseModel):
    userId: str = Field(min_length=1, max_length=128)
    role: str = Field(pattern="^(student|teacher)$")
    photos: list[str] = Field(min_length=3, max_length=5)


class VerificationRequest(BaseModel):
    userId: str = Field(min_length=1, max_length=128)
    images: list[str] = Field(min_length=3, max_length=10)
    templates: list[list[float]] = Field(min_length=3, max_length=5)
    modelVersion: str = Field(min_length=1, max_length=100)
    challenge: str = Field(pattern="^(blink|turn-left|turn-right)$")


def require_service_token(authorization: Annotated[str | None, Header()] = None) -> None:
    if not API_TOKEN:
        raise HTTPException(status_code=503, detail="Verifier service token is not configured")
    supplied = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not hmac.compare_digest(supplied, API_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")


def decode_image(data_url: str) -> np.ndarray:
    encoded = data_url.split(",", 1)[1] if "," in data_url else data_url
    try:
        image_bytes = base64.b64decode(encoded, validate=True)
        if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
            raise ValueError("Invalid image size")
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return np.asarray(image)[:, :, ::-1].copy()
    except (ValueError, UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=422, detail="Invalid camera image") from exc


def check_single_live_face(image: np.ndarray) -> None:
    try:
        faces = DeepFace.extract_faces(
            img_path=image,
            detector_backend="opencv",
            enforce_detection=True,
            align=True,
            anti_spoofing=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not verify a face in the camera image") from exc

    if len(faces) != 1 or faces[0].get("is_real") is not True:
        raise HTTPException(status_code=403, detail="A single live face is required")


def face_landmarks(images: list[np.ndarray]) -> list[list[object]]:
    landmark_sets: list[list[object]] = []
    with mp.solutions.face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.6,
    ) as detector:
        for image in images:
            result = detector.process(image[:, :, ::-1])
            if not result.multi_face_landmarks:
                raise HTTPException(status_code=422, detail="Face not visible throughout liveness check")
            landmark_sets.append(result.multi_face_landmarks[0].landmark)
    return landmark_sets


def eye_aspect_ratio(points: list[object], indexes: tuple[int, ...]) -> float:
    coordinates = np.array([[points[index].x, points[index].y] for index in indexes])
    vertical_a = np.linalg.norm(coordinates[1] - coordinates[5])
    vertical_b = np.linalg.norm(coordinates[2] - coordinates[4])
    horizontal = np.linalg.norm(coordinates[0] - coordinates[3])
    return float((vertical_a + vertical_b) / max(2 * horizontal, 1e-8))


def verify_liveness(images: list[np.ndarray], challenge: str) -> None:
    points = face_landmarks(images)
    if challenge == "blink":
        left_indexes = (33, 160, 158, 133, 153, 144)
        right_indexes = (362, 385, 387, 263, 373, 380)
        ratios = [
            (eye_aspect_ratio(frame, left_indexes) + eye_aspect_ratio(frame, right_indexes)) / 2
            for frame in points
        ]
        if max(ratios) < 0.19 or min(ratios) > 0.14 or max(ratios) - min(ratios) < 0.045:
            raise HTTPException(status_code=403, detail="Blink liveness challenge failed")
        return

    nose_positions = []
    for frame in points:
        left_eye = frame[33].x
        right_eye = frame[263].x
        eye_width = max(abs(right_eye - left_eye), 1e-6)
        nose_positions.append((frame[1].x - left_eye) / eye_width)
    movement = nose_positions[-1] - nose_positions[0]
    expected_direction = -1 if challenge == "turn-left" else 1
    if movement * expected_direction < 0.045:
        raise HTTPException(status_code=403, detail="Head-turn liveness challenge failed")


def represent(image: np.ndarray) -> np.ndarray:
    try:
        result = DeepFace.represent(
            img_path=image,
            model_name=MODEL_NAME,
            detector_backend="opencv",
            enforce_detection=True,
            align=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not create a face embedding") from exc
    if len(result) != 1:
        raise HTTPException(status_code=422, detail="Exactly one face must be visible")
    vector = np.asarray(result[0]["embedding"], dtype=np.float32)
    if vector.shape != (512,) or not np.isfinite(vector).all():
        raise HTTPException(status_code=422, detail="Face model returned an invalid embedding")
    return vector


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "modelVersion": MODEL_VERSION}


@app.post("/enroll")
def enroll(request: EnrollmentRequest,
           authorization: Annotated[str | None, Header()] = None) -> dict[str, object]:
    require_service_token(authorization)
    images = [decode_image(photo) for photo in request.photos]
    embeddings = []
    for image in images:
        check_single_live_face(image)
        embeddings.append(represent(image).tolist())
    return {"embeddings": embeddings, "modelVersion": MODEL_VERSION}


@app.post("/verify")
def verify(request: VerificationRequest,
           authorization: Annotated[str | None, Header()] = None) -> dict[str, object]:
    require_service_token(authorization)
    if request.modelVersion != MODEL_VERSION:
        raise HTTPException(status_code=409, detail="Face enrollment model version does not match")
    if any(len(template) != 512 or not np.isfinite(template).all() for template in request.templates):
        raise HTTPException(status_code=422, detail="Invalid stored face templates")

    images = [decode_image(image) for image in request.images]
    for image in images:
        check_single_live_face(image)
    verify_liveness(images, request.challenge)

    observed = [represent(image) for image in images[::2]]
    templates = np.asarray(request.templates, dtype=np.float32)
    template = templates.mean(axis=0)
    template_norm = np.linalg.norm(template)
    if template_norm <= 1e-8:
        raise HTTPException(status_code=422, detail="Invalid stored face templates")
    template /= template_norm

    similarities = []
    for vector in observed:
        norm = np.linalg.norm(vector)
        if norm <= 1e-8:
            continue
        similarities.append(float(np.dot(vector / norm, template)))
    if not similarities:
        raise HTTPException(status_code=422, detail="Could not compare face embeddings")

    confidence = max(0.0, min(1.0, float(np.mean(similarities))))
    return {"live": True, "confidence": confidence, "modelVersion": MODEL_VERSION}
