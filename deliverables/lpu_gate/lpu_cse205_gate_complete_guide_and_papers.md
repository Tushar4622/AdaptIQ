# LPU CSE205: DATA STRUCTURES & ALGORITHMS & GATE CSE MASTER GUIDE
### *Complete Curriculum-to-GATE Mapping, 10-Year Practice Papers (2017–2026), University Assessments, and Study Schedule*

---

## 1. ACADEMIC & EXAM PROFILE
* **University:** Lovely Professional University (LPU), B.Tech Computer Science and Engineering
* **Course:** CSE205 — Data Structures and Algorithms (Semester 3, 4 Credits: 3-0-2)
* **Target Exam:** GATE 2026 (Computer Science & Information Technology), Section 4: Data Structures & Programming
* **Target Exam Dates:** February 7, 8, 14, and 15, 2026 (Organizing Institute: IIT Guwahati)
* **Assessment Framework:** 2 Assignments, 3 Quizzes, 1 Mid-Term Examination (MTE), 1 End-Term Examination (ETE/ETP)

---

## 2. OFFICIAL COURSE OUTCOMES (COs)
* **CO1:** Understand and evaluate time & space complexity using asymptotic notations ($\mathcal{O}, \Omega, \Theta$) (Bloom's L2/L4).
* **CO2:** Illustrate memory allocation, node pointer manipulation, and variations of Linked Lists (Bloom's L2/L3).
* **CO3:** Apply Stacks & Queues (including circular & priority queues) to solve expression parsing and scheduling (Bloom's L3/L4).
* **CO4:** Construct and balance non-linear tree structures (BST, AVL trees, Heaps) (Bloom's L3/L4).
* **CO5:** Apply graph traversals (BFS, DFS, MST, Shortest Paths) and hashing collision techniques (Bloom's L3/L4).
* **CO6:** Construct robust, optimized code choosing appropriate data structures for problem solving (Bloom's L3/L4).

---

## 3. 10-YEAR GATE CSE TREND SUMMARY (2017–2026)

| Core Topic Area | 10-Year Marks Average | Trend Direction | Priority Level |
| :--- | :---: | :---: | :---: |
| **Binary Search Trees (BST)** *(Search probes, Deletion, Catalan)* | **1.7 marks** | Stable (Guaranteed NAT) | **MUST-DO** |
| **Binary Heaps & Priority Queues** *(`Build-Heap`, Max/Min Heapify)* | **1.6 marks** | Rising (Consistent NAT) | **MUST-DO** |
| **Binary Trees & Traversals** *(Reconstruction, Leaf Invariants)* | **1.5 marks** | Stable | **MUST-DO** |
| **Graph Traversals & MST** *(DFS Edges, Topological Sort, Kruskal)* | **2.0 marks** | High Priority (Core) | **MUST-DO** |
| **Stacks, Queues & Expressions** *(Postfix evaluation, Permutations)* | **1.2 marks** | Stable (Frequent MSQ) | **MUST-DO** |
| **Hashing & Collision Resolution** *(Linear Probing, Double Hashing)* | **1.0 mark** | Stable | **GOOD-TO-DO** |
| **B-Trees & File Structures** *(Node Capacity, Minimum Keys, Height)* | **1.5 marks** | High Yield (Regular NAT) | **GOOD-TO-DO** |
| **Linked Lists & Arrays** *(Pointer manipulation, Row-Major address)* | **0.5 marks** | Rotating | **GOOD-TO-DO** |

---

## 4. 10 ORIGINAL PRACTICE PAPERS (2017 TO 2026) — QUESTIONS & COMPLETE SOLUTIONS

### 📄 PAPER 1 (2017 PATTERN — 8 MARKS)
1. **Q1 [1M, MCQ]:** Proper binary tree with $N$ leaf nodes has total nodes:
   * **Answer:** `(B) 2N - 1`. Handshaking lemma: $L = n_2 + 1 \implies \text{Total} = N + (N-1) = 2N-1$.
2. **Q2 [1M, NAT]:** Row-Major address of $A[6][8]$ for $A[1..10][1..15]$ (Base 1000, 4 bytes/elem).
   * **Answer:** `1328`. Offset $= 5 \times 15 + 7 = 82$. Address $= 1000 + 82 \times 4 = 1328$.
3. **Q3 [2M, NAT]:** Postfix evaluation of `8 2 / 5 * 3 + 4 -`.
   * **Answer:** `19`. Steps: $(8/2)=4 \to 4 \times 5 = 20 \to 20 + 3 = 23 \to 23 - 4 = 19$.
4. **Q4 [2M, MCQ]:** Invalid BST search sequence for key $42$.
   * **Answer:** `(A) 10, 75, 64, 43, 60, 42`. Once left at 43, all subsequent keys must be $\le 42$; 60 violates upper bound.
5. **Q5 [2M, NAT]:** Comparisons to insert 10 into min-heap `[12, 18, 14, 25, 30, 19, 21, 33]`.
   * **Answer:** `3` comparisons. Key 10 bubbles up: compares with 25, then 18, then 12.

---

### 📄 PAPER 2 (2018 PATTERN — 10 MARKS)
1. **Q1 [1M, MCQ]:** Floyd's cycle detection maximum time complexity.
   * **Answer:** `(B) O(n)`. Fast pointer catches slow pointer within $F + C = n$ steps.
2. **Q2 [1M, NAT]:** Circular queue element count (`front=8, rear=3`, capacity 12).
   * **Answer:** `8` elements. Elements occupy $8, 9, 10, 11, 0, 1, 2, 3 \implies 8$ items.
3. **Q3 [2M, NAT]:** Linear probing slot for key 66 in hash table size 11 ($h(k) = k \bmod 11$).
   * **Answer:** `4`. Keys 22, 33, 44, 55 take slots 0, 1, 2, 3; 66 collides and lands in slot 4.
4. **Q4 [2M, MCQ]:** Necessary and sufficient condition for directed cycle in graph.
   * **Answer:** `(B) DFS produces at least one Back edge.`
5. **Q5 [2M, NAT]:** Distinct MST count for connected graph with strictly distinct edge weights.
   * **Answer:** `1`. Distinct edge weights guarantee a strictly unique MST.
6. **Q6 [2M, NAT]:** Minimum nodes in AVL tree of height 4.
   * **Answer:** `12`. $N(0)=1, N(1)=2, N(2)=4, N(3)=7, N(4)=12$.

---

### 📄 PAPER 3 (2019 PATTERN — 9 MARKS)
1. **Q1 [1M, MCQ]:** Impossible stack output permutation for input $1, 2, 3, 4, 5$.
   * **Answer:** `(C) 1, 5, 2, 4, 3`. Violates forbidden pattern $3-1-2$.
2. **Q2 [2M, NAT]:** Character immediately preceding root A in postorder traversal.
   * **Answer:** `C`. Tree postorder is $D, E, B, F, G, C, A$. Preceding character is C.
3. **Q3 [2M, NAT]:** Total key comparisons to build max-heap for `[4, 10, 3, 5, 1]`.
   * **Answer:** `6` comparisons. Index 2 takes 2 comparisons; Index 1 takes 4 comparisons.
4. **Q4 [2M, MCQ]:** Double hashing step size coprime to table size 100.
   * **Answer:** `(B) h2(k) = 1 + (k mod 99)`.
5. **Q5 [2M, NAT]:** Distinct valid topological sorts for DAG with edges $(A,B), (A,C), (B,D), (C,D), (D,E)$.
   * **Answer:** `2`. Only $B$ and $C$ can swap: $\langle A, B, C, D, E \rangle$ and $\langle A, C, B, D, E \rangle$.

---

### 📄 PAPER 4 (2020 PATTERN — 10 MARKS)
1. **Q1 [1M, MCQ]:** Asymptotic growth ordering of $n^{\log n}, 2^{\sqrt{n}}, \log(n!)$.
   * **Answer:** `(B) log(n!) < n^(log n) < 2^(sqrt n)`. Exponents: $\log n \ll (\log n)^2 \ll \sqrt{n}$.
2. **Q2 [1M, NAT]:** Inorder successor replacing root 15 in BST.
   * **Answer:** `20` (minimum node in right subtree of 15).
3. **Q3 [2M, NAT]:** Queue using two stacks total operations for 15 enqueues and 8 dequeues.
   * **Answer:** `53` operations ($15\text{ pushes} + 15\text{ pops} + 15\text{ pushes} + 8\text{ pops}$).
4. **Q4 [2M, NAT]:** Dijkstra shortest path distance from A to E.
   * **Answer:** `4` via path $A \to B \to E$ ($3 + 1 = 4$).
5. **Q5 [2M, MCQ]:** B-Tree of order 5 minimum non-root keys.
   * **Answer:** `(A) At least 2 keys and at most 4 keys` ($\lceil 5/2 \rceil - 1 = 2$).
6. **Q6 [2M, NAT]:** Rotations in AVL tree when inserting $10, 20, 30, 40, 50, 25$.
   * **Answer:** `3` rotations (Single Left at 10, Single Left at 30, Double RL at 20).

---

### 📄 PAPER 5 (2021 PATTERN — 10 MARKS — MSQ FORMAT)
1. **Q1 [1M, MCQ]:** BST Inorder traversal property.
   * **Answer:** `(B) Non-decreasing (sorted) order.`
2. **Q2 [1M, NAT]:** Empty slots in hash table range $[4 \dots 10]$ after linear probing.
   * **Answer:** `4` empty slots. Occupied slots are 5, 9, 10.
3. **Q3 [2M, MSQ]:** Minimum Spanning Tree properties.
   * **Answer:** `(A) and (C)`. Distinct weights ensure unique MST; minimum edge belongs to all MSTs.
4. **Q4 [2M, MSQ]:** Undirected graph DFS impossible edge types.
   * **Answer:** `(C) and (D)` (Forward and Cross edges can never exist in undirected graphs).
5. **Q5 [2M, NAT]:** Nodes in left subtree of node 32 in constructed BST.
   * **Answer:** `1` node (node 27).
6. **Q6 [2M, NAT]:** Minimum array index for smallest element in Max-Heap of size 1000.
   * **Answer:** `501` (first leaf node index: $\lfloor 1000/2 \rfloor + 1 = 501$).

---

### 📄 PAPER 6 (2022 PATTERN — 10 MARKS)
1. **Q1 [1M, MCQ]:** Data structure for compiler activation records.
   * **Answer:** `(B) Call Stack` (LIFO execution).
2. **Q2 [1M, NAT]:** Edges in complete bipartite graph $K_{4, 6}$.
   * **Answer:** `24` ($4 \times 6 = 24$).
3. **Q3 [2M, MSQ]:** Binary Heap true properties.
   * **Answer:** `(A), (B), and (C)`. Second largest is at index 2 or 3; third largest found in $\mathcal{O}(1)$; Build-Heap in $\mathcal{O}(n)$.
4. **Q4 [2M, NAT]:** Distinct topological orders for 5-vertex DAG.
   * **Answer:** `2`. Orders: $\langle A, B, C, D, E \rangle$ and $\langle A, C, B, D, E \rangle$.
5. **Q5 [2M, NAT]:** Number of successful `union()` operations in Kruskal's for $|V|=10$.
   * **Answer:** `9` unions ($V - 1 = 10 - 1 = 9$).
6. **Q6 [2M, MSQ]:** BST deletion structural invariants.
   * **Answer:** `(A), (B), (C), and (D)`. All four statements are correct.

---

### 📄 PAPER 7 (2023 PATTERN — 8 MARKS)
1. **Q1 [1M, MCQ]:** Efficient data structure for Undo/Redo.
   * **Answer:** `(B) Two LIFO stacks.`
2. **Q2 [1M, NAT]:** Minimum nodes in AVL tree of height 5.
   * **Answer:** `20` nodes. $N(5) = N(4) + N(3) + 1 = 12 + 7 + 1 = 20$.
3. **Q3 [2M, MSQ]:** Hashing collision resolution properties.
   * **Answer:** `(A), (B), (C), and (D)`. All four statements are correct.
4. **Q4 [2M, NAT]:** Possible integer values for intermediate key X during search for 35.
   * **Answer:** `18` values ($X \in [21, 34] \cup [36, 39]$).
5. **Q5 [2M, NAT]:** Total MST weight with negative edges using Kruskal's.
   * **Answer:** `-2`. Selected edges: $(-5) + (-2) + (-1) + 1 + 2 = -2$.

---

### 📄 PAPER 8 (2024 PATTERN — 10 MARKS)
1. **Q1 [1M, MSQ]:** B-Tree vs B+ Tree characteristics.
   * **Answer:** `(A), (B), and (D)`. Redundant keys do not occur in B-Trees.
2. **Q2 [1M, NAT]:** Leaf nodes in strictly proper binary tree with 40 internal nodes.
   * **Answer:** `41` leaves ($L = n_2 + 1 = 40 + 1 = 41$).
3. **Q3 [2M, NAT]:** Key comparisons to restore min-heap after root deletion for size 7.
   * **Answer:** `4` comparisons (2 at root, 2 at child level).
4. **Q4 [2M, MSQ]:** Conditions equivalent to bipartite graph.
   * **Answer:** `(A) and (B)` (No odd cycles $\iff$ 2-colorable).
5. **Q5 [2M, NAT]:** Topological sort orderings for multi-branch DAG.
   * **Answer:** `4` orderings ($2! \times 2! = 4$).
6. **Q6 [2M, NAT]:** Array index of last element in circular queue (`front=4, count=5`, size 10).
   * **Answer:** `8` ($4 + 5 - 1 = 8$).

---

### 📄 PAPER 9 (2025 PATTERN — 9 MARKS)
1. **Q1 [1M, MSQ]:** $\mathcal{O}(1)$ operations on Singly Linked Lists.
   * **Answer:** `(A), (B), and (D)`. Delete last node requires $\mathcal{O}(n)$.
2. **Q2 [2M, MSQ]:** Sufficient traversals to reconstruct unique binary tree.
   * **Answer:** `(A), (B), and (D)`. Inorder is mandatory; Preorder+Postorder is insufficient.
3. **Q3 [2M, NAT]:** Quadratic probing slot for key 28 ($h(k, i) = (k \bmod 7 + i^2) \bmod 7$).
   * **Answer:** `4` ($i=2 \implies (0 + 4) \bmod 7 = 4$).
4. **Q4 [2M, NAT]:** Structurally unique BSTs for 4 distinct keys.
   * **Answer:** `14` ($C_4 = \frac{1}{5}\binom{8}{4} = 14$).
5. **Q5 [2M, NAT]:** Shortest path length in edges from A to F via BFS.
   * **Answer:** `3` edges.

---

### 📄 PAPER 10 (2026 PATTERN — 10 MARKS — PREDICTIVE)
1. **Q1 [1M, MCQ]:** Recurrence $T(n) = 2T(n/2) + n \log n$.
   * **Answer:** `(B) Theta(n log^2 n)`. Case 2 of extended Master Theorem ($k=1$).
2. **Q2 [1M, NAT]:** Pointer assignments to reverse singly linked list of 100 nodes in-place.
   * **Answer:** `100` assignments (`curr->next = prev` runs once per node).
3. **Q3 [2M, MSQ]:** MST edge weight modification truths.
   * **Answer:** `(A), (B), and (D)`.
4. **Q4 [2M, NAT]:** Left child of root after deleting max from 10-element max-heap.
   * **Answer:** `75`. Sift-down swaps 40 with 80; 75 remains left child.
5. **Q5 [2M, NAT]:** Double hashing slot index for key 33.
   * **Answer:** `1` ($i=2 \implies (0 + 2 \times 6) \bmod 11 = 1$).
6. **Q6 [2M, MSQ]:** Queue using two stacks truths.
   * **Answer:** `(A), (B), and (D)`. Worst-case is $\mathcal{O}(n)$; amortized is $\mathcal{O}(1)$; space is $\mathcal{O}(n)$.

---

## 5. UNIVERSITY ASSIGNMENTS & MARKING SCHEMES
* **Assignment 1 (Complexity, Lists, Stacks & Queues — 30 Marks):** Due Week 5.
  * Q1: Asymptotic growth limits & Master theorem extended case (6 Marks).
  * Q2: In-place linked list reversal & Floyd's cycle detection proof (8 Marks).
  * Q3: Stack permutations forbidden pattern $3-1-2$ proof & postfix trace (8 Marks).
  * Q4: Dual-stack queue potential amortization & circular queue modulo (8 Marks).
* **Assignment 2 (Hierarchical Trees, Graphs & Hashing — 30 Marks):** Due Week 11.
  * Q1: Binary tree leaf invariant, reconstruction & BST valid search sequence (8 Marks).
  * Q2: AVL tree height recurrence derivation & rotation tracing (7 Marks).
  * Q3: Linear-time `Build-Heap` proof & min-heap root deletion comparisons (7 Marks).
  * Q4: DFS edge classification, topological sorts count & Kruskal negative edges (8 Marks).

---

## 6. CONTINUOUS ASSESSMENT QUIZZES
* **Quiz 1 (Units 1 & 2):** 10 Questions, 10 Marks. Covers asymptotic complexity, Master theorem, array memory mapping, linked list reversals, and cycle detection.
* **Quiz 2 (Units 3 & 4):** 10 Questions, 10 Marks. Covers postfix evaluation, stack permutations, circular queues, BST invariants, AVL balancing, and binary heaps.
* **Quiz 3 (Units 5 & 6):** 10 Questions, 10 Marks. Covers graph representations, BFS/DFS edge classification, topological sorting, Kruskal/Prim MST, Dijkstra, and open addressing hashing.

---

## 7. 14-WEEK STUDY SCHEDULE (COUNTDOWN TO FEB 7, 2026)
* **Weeks 1–3:** Asymptotic Analysis, Recurrence Relations, Arrays & Linked Lists (Quiz 1).
* **Weeks 4–6:** Stacks, Queues, Expression Parsing, and Permutations (Assignment 1 & Quiz 2).
* **Week 7:** Binary Trees, BST Invariants & Mid-Term Exam (MTE).
* **Weeks 8–10:** AVL Self-Balancing Trees, Binary Heaps & Priority Queues (Quiz 3).
* **Weeks 11–12:** Graph Traversals, Topological Sorting, MST, Shortest Paths & Hashing (Assignment 2 & ETE/ETP).
* **Weeks 13–14:** Full-Length GATE CSE Mock Tests, PyQ Speed Drills, and MSQ Elimination Sprint.
