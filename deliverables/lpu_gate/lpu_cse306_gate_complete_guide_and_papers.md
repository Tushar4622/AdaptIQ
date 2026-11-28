# LPU CSE306: Computer Networks
## Complete GATE CSE Mapping, 10 Original Practice Papers (2017–2026) & Continuous Assessment Architecture

---

# SECTION 1: 10 ORIGINAL GATE PRACTICE PAPERS (2017–2026 PATTERNS)

---

## Paper 2017 Pattern (Total: 8 Marks | 2x1M, 3x2M | 3 MCQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
In a sliding window protocol with a sender window size of $N$ frames, transmission delay $T_t$, and one-way propagation delay $T_p$, which formula gives the maximum channel utilization (efficiency $\eta$) in the absence of transmission errors? (Assume $a = T_p / T_t$ and negligible ACK transmission time).  
(A) $\eta = \frac{1}{1 + 2a}$  
(B) $\eta = \min\left(1, \; \frac{N}{1 + 2a}\right)$  
(C) $\eta = \frac{N}{1 + a}$  
(D) $\eta = \min\left(1, \; \frac{1 + 2a}{N}\right)$

#### Q2. [1 Mark | MCQ]
Host $A$ initiates a TCP connection to Host $B$ with an initial sequence number (ISN) of 5000. Host $B$ accepts the connection with an ISN of 8000. What are the Sequence number and Acknowledgment number fields in the `SYN+ACK` segment sent by Host $B$ to Host $A$?  
(A) $\text{Seq} = 8000, \; \text{Ack} = 5000$  
(B) $\text{Seq} = 8000, \; \text{Ack} = 5001$  
(C) $\text{Seq} = 8001, \; \text{Ack} = 5001$  
(D) $\text{Seq} = 5001, \; \text{Ack} = 8000$

#### Q3. [2 Marks | NAT]
Two hosts are connected by a 1 km coaxial cable running at a transmission speed of 100 Mbps ($10^8$ bps). The signal propagation velocity in the cable is $2 \times 10^8\text{ m/s}$. The hosts use the CSMA/CD protocol for medium access. What is the **minimum frame size** (in bytes) required for proper collision detection?  
**Answer:** `[Integer]`

#### Q4. [2 Marks | MCQ]
An IPv4 datagram of total size 4000 bytes (including a 20-byte IP header) arrives at a router and must be forwarded over an outgoing link with an MTU (Maximum Transmission Unit) of 1500 bytes. What are the **Fragment Offset** and the **More Fragments (MF)** flag values for the **third** fragment?  
(A) $\text{Offset} = 370, \; \text{MF} = 0$  
(B) $\text{Offset} = 370, \; \text{MF} = 1$  
(C) $\text{Offset} = 2960, \; \text{MF} = 0$  
(D) $\text{Offset} = 185, \; \text{MF} = 1$

#### Q5. [2 Marks | NAT]
A TCP sender uses the Slow Start and Congestion Avoidance algorithms. The slow-start threshold ($ssthresh$) is initially set to 16 MSS (Maximum Segment Size). The sender starts transmission with a congestion window ($cwnd$) of 1 MSS. Assuming no packet loss occurs, what is the size of the congestion window ($cwnd$) in MSS at the end of the **8th transmission round**?  
**Answer:** `[Integer]`

---

### Answer Key & Step-by-Step Solutions (2017)

* **Q1 Answer: (B)**  
  * **Solution:** Total time to send $N$ frames and receive an ACK is $T_{\text{total}} = T_t + 2T_p$.  
    Useful transmission time for $N$ frames is $N \times T_t$.  
    Efficiency $\eta = \frac{N \times T_t}{T_t + 2T_p} = \frac{N}{1 + 2(T_p/T_t)} = \frac{N}{1 + 2a}$.  
    Since channel utilization cannot exceed 100%, the maximum efficiency is $\min\left(1, \; \frac{N}{1 + 2a}\right)$.

* **Q2 Answer: (B)**  
  * **Solution:**  
    1. Host $A$'s `SYN` segment has $\text{Seq} = 5000$. Since `SYN` consumes 1 sequence number, Host $B$ acknowledges $5000 + 1 = 5001$.  
    2. Host $B$ chooses its own initial sequence number: $\text{Seq} = 8000$.  
    3. Therefore, Host $B$'s `SYN+ACK` segment carries $\text{Seq} = 8000$ and $\text{Ack} = 5001$.

* **Q3 Answer: 125**  
  * **Solution:**  
    1. One-way propagation delay:  
       $$T_p = \frac{\text{Distance}}{\text{Velocity}} = \frac{1000\text{ m}}{2 \times 10^8\text{ m/s}} = 5 \times 10^{-6}\text{ s} = 5\text{ }\mu\text{s}$$  
    2. For CSMA/CD collision detection:  
       $$T_t \ge 2 \cdot T_p \implies \frac{L_{\min}}{\text{Bandwidth}} \ge 2 \cdot T_p$$  
       $$L_{\min} \ge 2 \cdot (5 \times 10^{-6}\text{ s}) \times (10^8\text{ bits/s}) = 1000\text{ bits}$$  
    3. In bytes: $\frac{1000}{8} = \mathbf{125}$ bytes.

* **Q4 Answer: (A)**  
  * **Solution:**  
    1. Total datagram $= 4000$ bytes $\implies$ Data payload $= 4000 - 20 = 3980$ bytes.  
    2. Link $\text{MTU} = 1500$ bytes $\implies$ Max data per fragment $= \lfloor (1500 - 20)/8 \rfloor \times 8 = \lfloor 1480/8 \rfloor \times 8 = 185 \times 8 = 1480$ bytes.  
    3. Fragments:  
       - Fragment 1: Data $= 1480$ bytes (Bytes 0 to 1479). $\text{Offset} = 0/8 = 0, \text{MF} = 1$.  
       - Fragment 2: Data $= 1480$ bytes (Bytes 1480 to 2959). $\text{Offset} = 1480/8 = 185, \text{MF} = 1$.  
       - Fragment 3: Remaining data $= 3980 - (1480 \times 2) = 3980 - 2960 = 1020$ bytes (Bytes 2960 to 3979).  
         $\text{Offset} = 2960/8 = \mathbf{370}$. Since this is the last fragment, $\mathbf{MF = 0}$. Total fragment size $= 1020 + 20 = 1040 \le 1500$.

* **Q5 Answer: 20**  
  * **Solution:**  
    - Initial: $cwnd = 1, ssthresh = 16$.  
    - In Slow Start (doubles every round until $cwnd = ssthresh$):  
      - Round 1: $cwnd = 1 \implies 2$ MSS  
      - Round 2: $cwnd = 2 \implies 4$ MSS  
      - Round 3: $cwnd = 4 \implies 8$ MSS  
      - Round 4: $cwnd = 8 \implies 16$ MSS ($ssthresh$ reached!)  
    - In Congestion Avoidance (increases by 1 MSS every round):  
      - Round 5: $cwnd = 16 + 1 = 17$ MSS  
      - Round 6: $cwnd = 17 + 1 = 18$ MSS  
      - Round 7: $cwnd = 18 + 1 = 19$ MSS  
      - Round 8: $cwnd = 19 + 1 = \mathbf{20}$ MSS.

---

## Paper 2018 Pattern (Total: 8 Marks | 2x1M, 3x2M | 3 MCQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
Which of the following techniques is used in Distance Vector Routing to prevent two-node routing loops (Count-to-Infinity problem)?  
(A) Dijkstra's algorithm  
(B) Split Horizon with Poison Reverse  
(C) Flooding of link state packets  
(D) Path MTU Discovery

#### Q2. [1 Mark | MCQ]
A client requests an HTML base file that contains references to 4 small images located on the same web server. How many round-trip times ($RTT$) are required to fetch the base file and all 4 images using **Non-Persistent HTTP** without parallel connections? (Assume DNS resolution is already completed and transmission delay is negligible).  
(A) 5 RTT  
(B) 8 RTT  
(C) 10 RTT  
(D) 6 RTT

#### Q3. [2 Marks | NAT]
In a **Selective Repeat** sliding window protocol, the sender window size is 16 frames. What is the **minimum number of bits** required in the sequence number field of the frame header to guarantee correct operation without ambiguity?  
**Answer:** `[Integer]`

#### Q4. [2 Marks | NAT]
A bit stream `1101011011` is to be transmitted using the standard CRC method. The generator polynomial is $G(x) = x^3 + x + 1$ (binary divisor `1011`). What is the decimal value of the 3-bit CRC checksum appended to the transmitted message?  
**Answer:** `[Integer]`

#### Q5. [2 Marks | MCQ]
A router receives a packet with destination IP address `192.168.10.68`. Its routing table contains the following CIDR entries:
1. `192.168.10.0/24` via Interface `eth0`  
2. `192.168.10.64/28` via Interface `eth1`  
3. `192.168.10.64/26` via Interface `eth2`  
4. `0.0.0.0/0` via Interface `eth3`  
Which interface will the router forward the packet to using **Longest Prefix Matching**?  
(A) `eth0`  
(B) `eth1`  
(C) `eth2`  
(D) `eth3`

---

### Answer Key & Step-by-Step Solutions (2018)

* **Q1 Answer: (B)**  
  * **Solution:** Split Horizon prevents a node from advertising a route back to the neighbor from which it learned the route. Poison Reverse advertises that route with a cost of $\infty$, immediately breaking two-node routing loops.

* **Q2 Answer: (C)**  
  * **Solution:** Under serial Non-Persistent HTTP:  
    1. Each object requires 1 RTT for TCP 3-way handshake + 1 RTT to request and receive the object $= 2$ RTT per object.  
    2. Total objects $= 1\text{ (base HTML)} + 4\text{ (images)} = 5$ objects.  
    3. Total time $= 5 \times 2\text{ RTT} = \mathbf{10\text{ RTT}}$.

* **Q3 Answer: 5**  
  * **Solution:**  
    1. In Selective Repeat, the maximum sender window size $W_s$ and receiver window size $W_r$ must satisfy:  
       $$W_s + W_r \le 2^m$$  
    2. For optimal throughput, $W_s = W_r = 16 \implies 16 + 16 = 32 \le 2^m$.  
    3. $2^m \ge 32 \implies m \ge \log_2(32) = \mathbf{5}$ bits.

* **Q4 Answer: 6**  
  * **Solution:**  
    1. Generator polynomial $G(x) = x^3 + x + 1 \implies$ Divisor $= 1011$ (degree $r = 3$).  
    2. Append 3 zeros to message $M = 1101011011 \implies 1101011011000$.  
    3. Perform Modulo-2 division (XOR division):  
       - $1101011011000 \oplus 1011 \dots$  
       - Yields remainder $= 110_2$.  
    4. Decimal value of remainder $110_2 = 1 \times 4 + 1 \times 2 + 0 = \mathbf{6}$.

* **Q5 Answer: (B)**  
  * **Solution:** Destination IP: `192.168.10.68`. Convert 4th octet: $68 = 01000100_2$.  
    - Entry 1 (`/24`): matches (prefix length 24).  
    - Entry 3 (`/26`): prefix $64 = 01000000_2$. Mask covers first 2 bits: $01\dots$ matches! (prefix length 26).  
    - Entry 2 (`/28`): prefix $64 = 01000000_2$. Mask covers first 4 bits: $0100\dots$ $68$ is $01000100_2$. First 4 bits match! (prefix length 28).  
    - By Longest Prefix Matching, `/28` is the longest matching prefix (28 > 26 > 24). The packet is forwarded via interface **`eth1`**.

---

## Paper 2019 Pattern (Total: 8 Marks | 2x1M, 3x2M | 2 MCQ, 3 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
According to the Nyquist theorem, what is the maximum data rate (in bps) of a noiseless channel with a bandwidth of 4 kHz using 16-level signaling ($L = 16$)?  
(A) 16 kbps  
(B) 32 kbps  
(C) 64 kbps  
(D) 128 kbps

#### Q2. [1 Mark | NAT]
A network topology consists of 1 Router connected to two 24-port Layer-2 Switches. Each switch has 20 user PCs connected to its ports. Assuming default configuration without VLANs, what is the total number of **Broadcast Domains** in this network?  
**Answer:** `[Integer]`

#### Q3. [2 Marks | NAT]
In an Ethernet LAN using CSMA/CD at a data rate of 1 Gbps ($10^9$ bps), the minimum frame size is specified as 1024 bytes. If the signal propagation speed in the cable is $2 \times 10^8\text{ m/s}$, what is the **maximum distance** (in meters) between any two stations to ensure proper collision detection? (Neglect repeater delays).  
**Answer:** `[Integer]`

#### Q4. [2 Marks | NAT]
A host transmits continuous data over a 10 Gbps ($10^{10}$ bps) network using TCP. What is the **minimum time (in seconds)** required for the 32-bit TCP sequence number space to completely wrap around?  
**Answer:** `[Number, up to 2 decimal places]`

#### Q5. [2 Marks | MCQ]
The first byte of an incoming IPv4 datagram has the hexadecimal value $0\text{x}45$. The Total Length field in the header has the hexadecimal value $0\text{x}0200$. What are the length of the IP header and the size of the data payload (in decimal bytes)?  
(A) Header $= 20$ bytes, Payload $= 512$ bytes  
(B) Header $= 20$ bytes, Payload $= 492$ bytes  
(C) Header $= 5$ bytes, Payload $= 512$ bytes  
(D) Header $= 40$ bytes, Payload $= 472$ bytes

---

### Answer Key & Step-by-Step Solutions (2019)

* **Q1 Answer: (B)**  
  * **Solution:** Nyquist formula:  
    $$\text{Bit Rate} = 2 \cdot B \cdot \log_2(L) = 2 \times 4000 \times \log_2(16) = 8000 \times 4 = 32,000\text{ bps} = \mathbf{32\text{ kbps}}$$

* **Q2 Answer: 2**  
  * **Solution:** Layer-2 switches do NOT break broadcast domains; all ports on a switch reside in a single broadcast domain. A router interface terminates a broadcast domain. Since the router connects to 2 separate switch networks, there are exactly **2 Broadcast Domains**.

* **Q3 Answer: 819**  
  * **Solution:**  
    1. $L_{\min} = 1024\text{ bytes} = 1024 \times 8 = 8192\text{ bits}$.  
    2. Transmission delay:  
       $$T_t = \frac{L_{\min}}{B} = \frac{8192}{10^9} = 8.192 \times 10^{-6}\text{ s}$$  
    3. CSMA/CD requirement: $T_t \ge 2 T_p \implies T_p \le \frac{T_t}{2} = 4.096 \times 10^{-6}\text{ s}$.  
    4. Maximum distance:  
       $$d_{\max} = v \cdot T_p = (2 \times 10^8\text{ m/s}) \times (4.096 \times 10^{-6}\text{ s}) = 819.2\text{ m} \approx \mathbf{819\text{ m}}$$

* **Q4 Answer: 3.44 seconds**  
  * **Solution:**  
    1. TCP sequence number is 32 bits $\implies$ total sequence space $= 2^{32}$ bytes $= 4,294,967,296$ bytes.  
    2. Data rate $= 10\text{ Gbps} = \frac{10 \times 10^9}{8}\text{ bytes/sec} = 1.25 \times 10^9\text{ bytes/sec}$.  
    3. Wrap-around time:  
       $$T_{\text{wrap}} = \frac{2^{32}\text{ bytes}}{1.25 \times 10^9\text{ bytes/sec}} = \frac{4,294,967,296}{1,250,000,000} \approx \mathbf{3.44\text{ seconds}}$$

* **Q5 Answer: (B)**  
  * **Solution:**  
    1. First byte $= 0\text{x}45$. High nibble $= 4$ (IPv4). Low nibble $= 5$ (IHL).  
       Header Length $= 5 \times 4 = \mathbf{20\text{ bytes}}$.  
    2. Total Length $= 0\text{x}0200 = 2 \times 256 + 0 = 512$ bytes.  
    3. Payload size $= \text{Total Length} - \text{Header Length} = 512 - 20 = \mathbf{492\text{ bytes}}$.

---

## Paper 2020 Pattern (Total: 10 Marks | 2x1M, 4x2M | 4 MCQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
In a Stop-and-Wait ARQ protocol, if the propagation delay is $30\text{ ms}$ and the transmission delay of a frame is $10\text{ ms}$, what is the channel efficiency? (Assume ACK packets are instantaneous and no errors occur).  
(A) $14.3\%$  
(B) $25.0\%$  
(C) $33.3\%$  
(D) $50.0\%$

#### Q2. [1 Mark | MCQ]
Which ICMP message type is returned to the source host when the Time-to-Live (TTL) field in an IP datagram decrements to zero at an intermediate router during a `traceroute` probe?  
(A) Destination Unreachable (Type 3)  
(B) Time Exceeded (Type 11)  
(C) Echo Reply (Type 0)  
(D) Parameter Problem (Type 12)

#### Q3. [2 Marks | NAT]
A web browser requests an HTML base page that references 6 unique images hosted on the same server. The Round Trip Time ($RTT$) between client and server is $20\text{ ms}$. If the connection uses **Persistent HTTP without pipelining**, how much total time (in milliseconds) is spent retrieving the complete web page? (Neglect transmission delay and DNS lookup).  
**Answer:** `[Integer]`

#### Q4. [2 Marks | MCQ]
A TCP Reno connection encounters congestion upon receiving **3 duplicate ACKs**. At that exact instant, its congestion window is $cwnd = 32\text{ MSS}$. According to the Fast Recovery algorithm in TCP Reno, what are the new values of $ssthresh$ and $cwnd$ immediately after entering Fast Recovery?  
(A) $ssthresh = 16\text{ MSS}, \; cwnd = 1\text{ MSS}$  
(B) $ssthresh = 16\text{ MSS}, \; cwnd = 16\text{ MSS}$  
(C) $ssthresh = 16\text{ MSS}, \; cwnd = 19\text{ MSS}$  
(D) $ssthresh = 32\text{ MSS}, \; cwnd = 16\text{ MSS}$

#### Q5. [2 Marks | NAT]
An IP datagram carrying 2400 bytes of data (with a 20-byte IP header) is fragmented across an intermediate link with MTU $= 800$ bytes. What is the value of the **Fragment Offset** field (in decimal) in the **second** fragment?  
**Answer:** `[Integer]`

#### Q6. [2 Marks | MCQ]
A client host queries its Local DNS Server for `www.gate.org`. In an **Iterative DNS resolution**, how many separate DNS query messages are sent by the **Local DNS Server** if none of the records are cached?  
(A) 1  
(B) 2  
(C) 3  
(D) 4

---

### Answer Key & Step-by-Step Solutions (2020)

* **Q1 Answer: (A)**  
  * **Solution:**  
    $$a = \frac{T_p}{T_t} = \frac{30\text{ ms}}{10\text{ ms}} = 3$$  
    $$\eta = \frac{1}{1 + 2a} = \frac{1}{1 + 2(3)} = \frac{1}{7} \approx 0.1428 = \mathbf{14.3\%}$$

* **Q2 Answer: (B)**  
  * **Solution:** When a router decrements the TTL field to 0, it drops the datagram and sends an **ICMP Time Exceeded (Type 11, Code 0)** message back to the sender.

* **Q3 Answer: 160 ms**  
  * **Solution:**  
    1. Persistent HTTP reuses a single TCP connection.  
    2. TCP 3-way handshake $= 1$ RTT.  
    3. Base HTML page request and receive $= 1$ RTT.  
    4. Each of the 6 images is requested sequentially (without pipelining): $6 \times 1\text{ RTT} = 6$ RTT.  
    5. Total RTTs $= 1 + 1 + 6 = 8$ RTT.  
    6. Total time $= 8 \times 20\text{ ms} = \mathbf{160\text{ ms}}$.

* **Q4 Answer: (C)**  
  * **Solution:** In TCP Reno, upon detecting packet loss via 3 duplicate ACKs:  
    - $ssthresh = \lfloor cwnd / 2 \rfloor = 32 / 2 = 16$ MSS.  
    - Fast Recovery sets $cwnd = ssthresh + 3\text{ MSS} = 16 + 3 = \mathbf{19\text{ MSS}}$ (the $+3$ accounts for the 3 packets that successfully left the network and triggered the duplicate ACKs).

* **Q5 Answer: 97**  
  * **Solution:**  
    1. Link $\text{MTU} = 800$ bytes $\implies$ Maximum payload $= \lfloor (800 - 20)/8 \rfloor \times 8 = \lfloor 780/8 \rfloor \times 8 = 97 \times 8 = 776$ bytes.  
    2. Fragment 1 carries bytes 0 to 775 (776 bytes).  
    3. Fragment 2 starts at byte 776.  
    4. $\text{Fragment Offset} = \frac{776}{8} = \mathbf{97}$.

* **Q6 Answer: (C)**  
  * **Solution:** In iterative resolution, the Local DNS server queries:  
    1. Root DNS server (receives TLD referral).  
    2. `.org` TLD DNS server (receives Authoritative referral).  
    3. `gate.org` Authoritative DNS server (receives the mapping).  
    Total queries sent by the Local DNS server $= \mathbf{3}$.

---

## Paper 2021 Pattern (Total: 8 Marks | 2x1M, 3x2M | 2 MCQ, 2 MSQ, 1 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
What is the minimum Hamming distance ($d_{\min}$) required between valid codewords in an error-correcting code to detect up to 3-bit errors and correct up to 2-bit errors?  
(A) 4  
(B) 5  
(C) 6  
(D) 7

#### Q2. [1 Mark | MSQ]
Which of the following statements is/are **TRUE** regarding TCP Congestion Control?  
(A) In the Slow Start phase, the congestion window increases exponentially with respect to time (doubles every RTT).  
(B) In the Congestion Avoidance phase, the congestion window increases by 1 MSS for each acknowledged RTT.  
(C) A timeout event always resets $cwnd$ to 1 MSS in both TCP Tahoe and TCP Reno.  
(D) TCP Reno enters Slow Start immediately after receiving 3 duplicate ACKs.

#### Q3. [2 Marks | MSQ]
Which of the following statements is/are **TRUE** for Sliding Window Protocols?  
(A) Go-Back-N uses cumulative acknowledgments, whereas Selective Repeat uses independent acknowledgments.  
(B) In Go-Back-N, the receiver buffer size is 1 frame.  
(C) Out-of-order frames are buffered by the receiver in Go-Back-N.  
(D) Selective Repeat requires sequence numbers of at least twice the sender window size ($2^m \ge 2 W_s$).

#### Q4. [2 Marks | NAT]
A Token Bucket traffic shaper has a bucket capacity of 2 Megabytes ($2 \times 10^6$ bytes). Tokens arrive at a constant rate of 5 Megabytes/sec ($5 \times 10^6$ bytes/sec). The maximum transmission burst speed of the output interface is 25 Megabytes/sec ($25 \times 10^6$ bytes/sec). What is the **maximum duration** (in seconds) that the host can transmit at the peak rate of 25 MB/sec?  
**Answer:** `[Number, up to 2 decimal places]`

#### Q5. [2 Marks | MCQ]
An organization is granted the block `172.16.0.0/16`. The network administrator needs to create subnets that can each support up to 500 hosts. What is the custom subnet mask that provides the maximum number of such subnets?  
(A) `255.255.254.0` (`/23`)  
(B) `255.255.255.0` (`/24`)  
(C) `255.255.252.0` (`/22`)  
(D) `255.255.248.0` (`/21`)

---

### Answer Key & Step-by-Step Solutions (2021)

* **Q1 Answer: (B)**  
  * **Solution:**  
    - To detect $d = 3$ errors: $d_{\min} \ge d + 1 = 3 + 1 = 4$.  
    - To correct $t = 2$ errors: $d_{\min} \ge 2t + 1 = 2(2) + 1 = 5$.  
    - To satisfy both: $d_{\min} \ge \max(4, 5) = \mathbf{5}$.

* **Q2 Answer: (A, B, C)**  
  * **Solution:**  
    - (A), (B), and (C) are classic TCP properties.  
    - (D) is FALSE: TCP Reno enters Fast Recovery (not Slow Start) on 3 duplicate ACKs.

* **Q3 Answer: (A, B, D)**  
  * **Solution:**  
    - In GBN, the receiver discards all out-of-order frames ($W_r = 1$), so (C) is FALSE. Statements (A), (B), and (D) are TRUE.

* **Q4 Answer: 0.10 seconds**  
  * **Solution:**  
    1. Let $S$ be the burst duration.  
    2. During burst duration $S$, total bytes transmitted $= C + r \cdot S$, where $C = 2\text{ MB}$, $r = 5\text{ MB/s}$.  
    3. Peak transmission speed $M = 25\text{ MB/s}$.  
       $$M \cdot S = C + r \cdot S \implies S = \frac{C}{M - r} = \frac{2}{25 - 5} = \frac{2}{20} = \mathbf{0.10\text{ seconds}}$$

* **Q5 Answer: (A)**  
  * **Solution:**  
    1. To support 500 hosts: $2^h - 2 \ge 500 \implies h = 9$ bits ($2^9 - 2 = 510 \ge 500$).  
    2. Network prefix bits $= 32 - 9 = 23$ bits (`/23`).  
    3. Subnet mask with 23 ones: `11111111.11111111.11111110.00000000` $= \mathbf{255.255.254.0}$.

---

## Paper 2022 Pattern (Total: 8 Marks | 2x1M, 3x2M | 2 MCQ, 1 MSQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
When Host $A$ needs to find the MAC address of Host $B$ on the same local Ethernet broadcast domain, it sends an Address Resolution Protocol (ARP) Request. What are the transmission modes of the ARP Request and the ARP Reply?  
(A) Both Request and Reply are Broadcast.  
(B) Both Request and Reply are Unicast.  
(C) Request is Broadcast; Reply is Unicast.  
(D) Request is Unicast; Reply is Broadcast.

#### Q2. [1 Mark | MSQ]
Which of the following statements is/are **TRUE** regarding the Binary Exponential Backoff algorithm used in Ethernet CSMA/CD?  
(A) After $n$ collisions, a station chooses a backoff slot randomly from the range $[0, 2^n - 1]$ for $n \le 10$.  
(B) The maximum backoff range is capped at $[0, 1023]$ for $n \ge 10$.  
(C) If collision persists after 16 attempts, the frame is aborted and reported as an error.  
(D) The slot time in 10 Mbps Ethernet is defined as 51.2 microseconds (512 bit times).

#### Q3. [2 Marks | NAT]
A Stop-and-Wait ARQ connection operates over a satellite link with bandwidth 1 Mbps and one-way propagation delay $250\text{ ms}$. The frame size is 1000 bytes. Neglecting ACK transmission and processing delays, what is the effective throughput of the link in **kbps**?  
**Answer:** `[Number, up to 2 decimal places]`

#### Q4. [2 Marks | MCQ]
Consider three routers $A, B, C$ connected in a line: $A - B - C$. The distance vector routing protocol is running. Initially, distance from $B$ to $C$ is 1, and $A$ to $C$ via $B$ is 2. If the link between $B$ and $C$ fails, how does the Count-to-Infinity problem manifest between $A$ and $B$?  
(A) $B$ updates its cost to $C$ as $\infty$ immediately.  
(B) $B$ believes it can reach $C$ through $A$ with cost $2 + 1 = 3$, and $A$ updates its cost to $C$ as $3 + 1 = 4$, bouncing upward.  
(C) $A$ immediately sends a poisoned reverse packet to $B$.  
(D) The network converges in exactly 1 round.

#### Q5. [2 Marks | NAT]
A 10 Mbps standard Ethernet network has a maximum cable length of 2.5 km between two stations. The propagation speed is $2 \times 10^8\text{ m/s}$. The network contains 4 repeaters, each introducing a delay of 2 microseconds. What is the **minimum frame size** (in bits) required to guarantee collision detection?  
**Answer:** `[Integer]`

---

### Answer Key & Step-by-Step Solutions (2022)

* **Q1 Answer: (C)**  
  * **Solution:** Host $A$ does not know Host $B$'s MAC address, so it broadcasts the ARP Request (`FF:FF:FF:FF:FF:FF`). Host $B$ receives the request and replies directly to Host $A$'s known MAC address via Unicast.

* **Q2 Answer: (A, B, C, D)**  
  * **Solution:** All four statements are IEEE 802.3 standard specifications for Binary Exponential Backoff.

* **Q3 Answer: 15.75 kbps**  
  * **Solution:**  
    1. Frame size $L = 1000\text{ bytes} = 8000\text{ bits}$.  
    2. Transmission delay:  
       $$T_t = \frac{8000}{10^6\text{ bps}} = 8\text{ ms}$$  
    3. Propagation delay $T_p = 250\text{ ms}$.  
    4. Total cycle time $= T_t + 2T_p = 8 + 2(250) = 508\text{ ms} = 0.508\text{ s}$.  
    5. Throughput $= \frac{L}{T_{\text{cycle}}} = \frac{8000\text{ bits}}{0.508\text{ s}} \approx 15,748\text{ bps} \approx \mathbf{15.75\text{ kbps}}$.

* **Q4 Answer: (B)**  
  * **Solution:** When $B-C$ breaks, $B$ checks its neighbors. Since $A$ advertised distance 2 to $C$, $B$ incorrectly concludes it can reach $C$ via $A$ at cost $1 + 2 = 3$. $A$ then updates its cost via $B$ to $3 + 1 = 4$, ping-ponging upward to infinity.

* **Q5 Answer: 410 bits**  
  * **Solution:**  
    1. Cable propagation delay:  
       $$T_{\text{cable}} = \frac{2500\text{ m}}{2 \times 10^8\text{ m/s}} = 12.5\text{ }\mu\text{s}$$  
    2. Repeater delay $= 4 \times 2\text{ }\mu\text{s} = 8\text{ }\mu\text{s}$.  
    3. One-way propagation delay $T_p = 12.5 + 8 = 20.5\text{ }\mu\text{s}$.  
    4. Collision detection: $T_t \ge 2 T_p = 2 \times 20.5\text{ }\mu\text{s} = 41\text{ }\mu\text{s}$.  
    5. Minimum frame size $= 41 \times 10^{-6}\text{ s} \times 10 \times 10^6\text{ bps} = \mathbf{410\text{ bits}}$.

---

## Paper 2023 Pattern (Total: 10 Marks | 2x1M, 4x2M | 3 MCQ, 2 MSQ, 1 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
Which of the following TCP header flag combinations is **INVALID** under normal protocol operation?  
(A) `SYN = 1, ACK = 0`  
(B) `SYN = 1, ACK = 1`  
(C) `SYN = 1, FIN = 1`  
(D) `FIN = 1, ACK = 1`

#### Q2. [1 Mark | MSQ]
Which of the following fields exist in an **IPv4** header but are **OMITTED** in the fixed base **IPv6** header?  
(A) Header Checksum  
(B) Identification and Fragment Offset  
(C) Header Length (IHL)  
(D) Hop Limit

#### Q3. [2 Marks | MSQ]
Consider a Go-Back-N sliding window protocol using a 3-bit sequence number field. Which of the following statements is/are **TRUE**?  
(A) The maximum sender window size is 7 frames.  
(B) If sender window is set to 8, protocol failures occur due to sequence ambiguity.  
(C) An acknowledgment packet with $\text{ACK} = 5$ cumulatively confirms receipt of all frames up to 4.  
(D) The receiver must buffer up to 7 out-of-order frames.

#### Q4. [2 Marks | NAT]
A TCP Reno sender experiences packet loss due to a **retransmission timeout** when its $cwnd$ is 24 MSS. How many transmission rounds will it take for the $cwnd$ to reach **14 MSS** again, assuming no subsequent packet drops occur?  
**Answer:** `[Integer]`

#### Q5. [2 Marks | MCQ]
In Link State Routing, every node constructs the entire network topology map by collecting Link State Advertisements (LSAs) and runs Dijkstra's algorithm to compute:  
(A) The longest path to prevent routing loops  
(B) The shortest path tree with itself as the root  
(C) The minimum spanning tree connecting all routers  
(D) The number of hops to the border gateway

#### Q6. [2 Marks | MCQ]
A message of size 10,000 bits is sent across 3 packet-switching links in series (Source $\to R_1 \to R_2 \to$ Dest). Each link has bandwidth 1 Mbps and negligible propagation delay. If the message is divided into 10 packets of 1000 bits each (no headers), what is the total time required for the destination to receive the entire message?  
(A) $10\text{ ms}$  
(B) $12\text{ ms}$  
(C) $30\text{ ms}$  
(D) $15\text{ ms}$

---

### Answer Key & Step-by-Step Solutions (2023)

* **Q1 Answer: (C)**  
  * **Solution:** `SYN` is used strictly to establish connections, while `FIN` is used to terminate connections. Setting both simultaneously is contradictory and invalid.

* **Q2 Answer: (A, B, C)**  
  * **Solution:** IPv6 eliminates Header Checksum (delegated to L2/L4), Fragment Offset/ID (moved to optional extension headers), and IHL (fixed 40-byte base header). "Hop Limit" replaced TTL.

* **Q3 Answer: (A, B, C)**  
  * **Solution:**  
    - For 3 bits: $W_s \le 2^3 - 1 = 7$. (A is TRUE).  
    - If $W_s = 8$, full-window ACK loss creates duplicate ambiguity. (B is TRUE).  
    - GBN uses cumulative ACKs. (C is TRUE).  
    - (D) is FALSE: GBN receiver never buffers out-of-order frames ($W_r = 1$).

* **Q4 Answer: 6**  
  * **Solution:**  
    1. On Timeout from $cwnd = 24$:  
       - $ssthresh = \lfloor 24 / 2 \rfloor = 12$ MSS.  
       - $cwnd = 1$ MSS (resets to Slow Start).  
    2. Slow Start rounds (doubles):  
       - Round 1: $cwnd = 1 \to 2$  
       - Round 2: $cwnd = 2 \to 4$  
       - Round 3: $cwnd = 4 \to 8$  
       - Round 4: $cwnd = 8 \to 12$ ($ssthresh = 12$ reached!)  
    3. Congestion Avoidance rounds (adds 1):  
       - Round 5: $cwnd = 12 + 1 = 13$  
       - Round 6: $cwnd = 13 + 1 = \mathbf{14}$ MSS.  
    Total rounds $= \mathbf{6}$.

* **Q5 Answer: (B)**  
  * **Solution:** Dijkstra's algorithm computes the single-source shortest path tree rooted at the executing node to all destination nodes.

* **Q6 Answer: (B)**  
  * **Solution:**  
    1. Packet size $= 1000$ bits $\implies T_{\text{packet}} = \frac{1000}{10^6\text{ bps}} = 1\text{ ms}$.  
    2. Pipelined store-and-forward transmission over $N = 3$ links for $k = 10$ packets:  
       $$\text{Total Time} = (k + N - 1) \cdot T_{\text{packet}} = (10 + 3 - 1) \times 1\text{ ms} = 12 \times 1\text{ ms} = \mathbf{12\text{ ms}}$$

---

## Paper 2024 Pattern (Total: 8 Marks | 2x1M, 3x2M | 2 MCQ, 2 MSQ, 1 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
Under **Persistent HTTP with pipelining**, how are multiple web page objects retrieved over an established TCP connection?  
(A) The client sends a new request only after receiving the response for the previous request.  
(B) The client sends back-to-back requests for all referenced objects without waiting for intervening responses.  
(C) The client opens a separate TCP connection for each object.  
(D) The server pushes objects unsolicited using UDP.

#### Q2. [1 Mark | MSQ]
Which of the following error detection capabilities is/are guaranteed by a CRC code with generator polynomial $G(x) = (x + 1) P(x)$?  
(A) All single-bit errors  
(B) All double-bit errors  
(C) All odd-numbered bit errors  
(D) Any burst error of length less than or equal to the degree of $G(x)$

#### Q3. [2 Marks | MSQ]
Four contiguous Class C network blocks are to be supernetted into a single CIDR block:
`198.16.16.0/24`, `198.16.17.0/24`, `198.16.18.0/24`, `198.16.19.0/24`.  
Which of the following statements is/are **TRUE**?  
(A) The supernetted network address is `198.16.16.0/22`.  
(B) The supernet mask is `255.255.252.0`.  
(C) The third octet base number (16) is divisible by 4, satisfying boundary alignment.  
(D) The total number of usable host addresses in the supernet is 1022.

#### Q4. [2 Marks | NAT]
In Ethernet CSMA/CD, two stations $A$ and $B$ collide on their first transmission attempt. Both stations choose backoff slots from $\{0, 1\}$. What is the probability that they will **collide again** on their second attempt?  
**Answer:** `[Number, up to 2 decimal places]`

#### Q5. [2 Marks | MCQ]
A routing table has the following four CIDR prefix entries:
- Entry 1: `202.10.16.0/20`
- Entry 2: `202.10.24.0/21`
- Entry 3: `202.10.28.0/22`
- Entry 4: `202.10.0.0/16`  
Which prefix will match destination IP `202.10.29.5` under Longest Prefix Matching?  
(A) Entry 1  
(B) Entry 2  
(C) Entry 3  
(D) Entry 4

---

### Answer Key & Step-by-Step Solutions (2024)

* **Q1 Answer: (B)**  
  * **Solution:** Pipelining allows the client to dispatch requests consecutively as soon as references are parsed, without waiting for previous responses.

* **Q2 Answer: (A, C, D)**  
  * **Solution:**  
    - Containing the factor $(x+1)$ guarantees detection of all odd-numbered errors.  
    - Degree $r$ detects all burst errors $\le r$.  
    - Single-bit errors are detected if $G(x)$ has more than 1 non-zero term.  
    - (B) is not guaranteed unless $P(x)$ has specific primitive root properties.

* **Q3 Answer: (A, B, C, D)**  
  * **Solution:**  
    - 4 blocks $\implies$ combine 2 bits $\implies /24 - 2 = /22$ (Mask `255.255.252.0`).  
    - Base is 16 ($16 \bmod 4 = 0 \implies$ aligned).  
    - Usable hosts $= 2^{10} - 2 = 1024 - 2 = 1022$. All statements are TRUE.

* **Q4 Answer: 0.50**  
  * **Solution:**  
    - Sample space for pairs $(A, B) \in \{0, 1\} \times \{0, 1\}$: $\{(0,0), (0,1), (1,0), (1,1)\}$. Total $= 4$ outcomes.  
    - Collision occurs if both pick the same slot: $\{(0,0), (1,1)\} \implies 2$ outcomes.  
    - Probability $= \frac{2}{4} = \mathbf{0.50}$.

* **Q5 Answer: (C)**  
  * **Solution:** Third octet of destination $= 29 = 00011101_2$.  
    - Entry 3: `202.10.28.0/22`. Base $28 = 00011100_2$. Mask length 22 covers first 6 bits: $000111\dots$ matches!  
    - Since `/22` is the longest matching prefix (22 > 21 > 20 > 16), Entry 3 is selected.

---

## Paper 2025 Pattern (Total: 8 Marks | 2x1M, 3x2M | 2 MCQ, 1 MSQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
What is the fundamental difference between TCP Flow Control and TCP Congestion Control?  
(A) Flow control prevents sender from overwhelming receiver buffer; congestion control prevents network pipe congestion.  
(B) Flow control handles packet drops; congestion control handles checksum errors.  
(C) Flow control is managed by routers; congestion control is managed by receivers.  
(D) Flow control uses UDP; congestion control uses TCP.

#### Q2. [1 Mark | MSQ]
Which of the following DNS Resource Records (RR) are correctly paired with their definitions?  
(A) `A`: Maps a domain hostname to an IPv4 address.  
(B) `AAAA`: Maps a domain hostname to an IPv6 address.  
(C) `CNAME`: Canonical name record specifying an alias for a domain.  
(D) `MX`: Mail exchange record specifying the mail server responsible for receiving emails.

#### Q3. [2 Marks | NAT]
A host transmits a 1 MB file ($10^6$ bytes) over a 10 Mbps link with a propagation delay of $10\text{ ms}$. If data is packetized into 1000-byte packets and intermediate store-and-forward switches add a total transmission latency of $2\text{ ms}$, what is the total transfer time (in seconds)?  
**Answer:** `[Number, up to 2 decimal places]`

#### Q4. [2 Marks | MCQ]
Host $A$ sends 4000 bytes of data to Host $B$ over a TCP connection in 4 consecutive segments of 1000 bytes each. If the first segment has Sequence Number 10,001, what Sequence Number does Host $B$ specify in the acknowledgment for the **fourth** segment?  
(A) 13,001  
(B) 14,000  
(C) 14,001  
(D) 15,001

#### Q5. [2 Marks | NAT]
A Go-Back-N link has bandwidth 10 Mbps and propagation delay $40\text{ ms}$. The frame size is 1250 bytes. What is the **minimum window size** $N$ required to achieve $100\%$ channel utilization?  
**Answer:** `[Integer]`

---

### Answer Key & Step-by-Step Solutions (2025)

* **Q1 Answer: (A)**  
  * **Solution:** Flow control is an end-to-end mechanism between sender and receiver (`rwnd`), while congestion control prevents saturation of intermediate network links (`cwnd`).

* **Q2 Answer: (A, B, C, D)**  
  * **Solution:** All four DNS resource record mappings are standard IETF definitions.

* **Q3 Answer: 0.81 seconds**  
  * **Solution:**  
    1. Transmission time for 1 MB at 10 Mbps:  
       $$T_t = \frac{10^6 \times 8\text{ bits}}{10 \times 10^6\text{ bps}} = 0.80\text{ s}$$  
    2. Propagation delay $= 10\text{ ms} = 0.01\text{ s}$. Switch delay $= 2\text{ ms} = 0.002\text{ s}$.  
    3. Total time $= 0.80 + 0.01 + 0.002 = \mathbf{0.81\text{ seconds}}$.

* **Q4 Answer: (C)**  
  * **Solution:** Segment 1: 10,001 to 11,000. Segment 2: 11,001 to 12,000. Segment 3: 12,001 to 13,000. Segment 4: 13,001 to 14,000.  
    Host $B$ acknowledges the *next expected byte*: $14,000 + 1 = \mathbf{14,001}$.

* **Q5 Answer: 81**  
  * **Solution:**  
    1. Frame size $L = 1250\text{ bytes} = 10,000\text{ bits}$.  
    2. $T_t = \frac{10,000}{10^7\text{ bps}} = 1\text{ ms}$.  
    3. $T_p = 40\text{ ms} \implies a = \frac{40}{1} = 40$.  
    4. For $\eta = 100\%$:  
       $$N \ge 1 + 2a = 1 + 2(40) = \mathbf{81}\text{ frames}$$

---

## Paper 2026 Pattern (Total: 10 Marks | 2x1M, 4x2M | 3 MCQ, 2 MSQ, 1 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
Why is CSMA/CD unfeasible in Wireless LANs (IEEE 802.11), necessitating the use of CSMA/CA instead?  
(A) Wireless transmitters cannot detect collisions because their own transmitted signal overwhelms any incoming collided signal (high dynamic range problem).  
(B) Wireless bandwidth is too high for collision detection.  
(C) Frame sizes in wireless LANs are too large.  
(D) Wireless access points do not support ACK packets.

#### Q2. [1 Mark | MSQ]
Which of the following statements is/are **TRUE** regarding IPv4 packet fragmentation?  
(A) Fragmentation can be performed by the source host and intermediate routers.  
(B) Reassembly of fragmented IP packets is performed exclusively at the final destination host.  
(C) The Fragment Offset field in an IP header is expressed in units of 8-byte blocks.  
(D) If any single fragment of an IP datagram is lost, the destination discards all received fragments of that datagram upon reassembly timeout.

#### Q3. [2 Marks | MSQ]
Which of the following statements is/are **TRUE** regarding Sliding Window flow control?  
(A) In Go-Back-N, losing an acknowledgment does not necessarily trigger retransmissions if a subsequent cumulative acknowledgment arrives before timer expiry.  
(B) Selective Repeat requires a timer for each unacknowledged frame.  
(C) In Selective Repeat, $W_s$ and $W_r$ must satisfy $W_s + W_r \le 2^m$.  
(D) Stop-and-Wait is a special case of Go-Back-N with $W_s = 1$ and $W_r = 1$.

#### Q4. [2 Marks | NAT]
A TCP Reno sender experiences a transmission loss detected by **3 duplicate ACKs** at round 10 when its congestion window is $cwnd = 36\text{ MSS}$. What is the value of the congestion window ($cwnd$) in MSS at the start of **round 13** under Fast Recovery and Additive Increase?  
**Answer:** `[Integer]`

#### Q5. [2 Marks | MCQ]
In Distance Vector Routing, what happens when Split Horizon is combined with Poison Reverse?  
(A) Routers advertise a cost of $\infty$ for a route to the neighbor from which that route was learned.  
(B) The routing update interval is reduced to zero.  
(C) Loops of length 3 or more are completely eliminated.  
(D) Routers stop exchanging periodic updates.

#### Q6. [2 Marks | MCQ]
A noisy channel has a bandwidth of 10 kHz and a Signal-to-Noise Ratio ($\text{SNR}$) of 1023. According to the Shannon Capacity Theorem, what is the maximum theoretical channel capacity in kbps?  
(A) 50 kbps  
(B) 100 kbps  
(C) 102.3 kbps  
(D) 200 kbps

---

### Answer Key & Step-by-Step Solutions (2026)

* **Q1 Answer: (A)**  
  * **Solution:** Wireless transceivers cannot transmit and listen simultaneously because their own broadcast power drowns out the weak signals from distant transmitters (often $10^5$ times weaker). Thus, collisions cannot be reliably detected during transmission.

* **Q2 Answer: (A, B, C, D)**  
  * **Solution:** All four statements are fundamental truths of IPv4 fragmentation and reassembly.

* **Q3 Answer: (A, B, C, D)**  
  * **Solution:** All four statements correctly capture the core invariants of sliding window protocols.

* **Q4 Answer: 21 MSS**  
  * **Solution:**  
    1. At loss (round 10): $cwnd = 36\text{ MSS}$.  
    2. Upon 3 Dup ACKs: $ssthresh = \lfloor 36 / 2 \rfloor = 18\text{ MSS}$.  
    3. TCP Reno exits Fast Recovery once the missing segment is acknowledged and enters Congestion Avoidance with $cwnd = ssthresh = 18\text{ MSS}$.  
    4. Rounds:  
       - Round 11: $cwnd = 18 + 1 = 19$ MSS.  
       - Round 12: $cwnd = 19 + 1 = 20$ MSS.  
       - Round 13: $cwnd = 20 + 1 = \mathbf{21\text{ MSS}}$.

* **Q5 Answer: (A)**  
  * **Solution:** Poison Reverse explicitly advertises $d = \infty$ for a destination back to the neighbor through which the destination is reached, ensuring immediate loop suppression.

* **Q6 Answer: (B)**  
  * **Solution:**  
    $$C = B \log_2(1 + \text{SNR}) = 10\text{ kHz} \times \log_2(1 + 1023) = 10 \times \log_2(1024) = 10 \times 10 = \mathbf{100\text{ kbps}}$$

---

# SECTION 2: UNIVERSITY CONTINUOUS ASSESSMENTS & REUSE MATRIX

---

## 1. University Problem-Solving Assignments & Marking Rubrics

### Assignment 1: Sliding Window Flow Control, CSMA/CD & CIDR Subnetting
* **Max Marks:** 25  
* **Mapped COs:** CO2, CO3, CO4  
* **Part A (15 Marks):** Flow Control & MAC Calculations  
  1. A satellite link has a bandwidth of 2 Mbps and one-way propagation delay of 200 ms. Frame size is 2000 bytes.  
     a) Calculate the channel efficiency for Stop-and-Wait ARQ. (3 Marks)  
     b) Calculate the minimum window size $N$ for Go-Back-N to achieve $100\%$ efficiency. (3 Marks)  
     c) How many sequence number bits are needed for Selective Repeat with this window size? (3 Marks)  
  2. A 100 Mbps Ethernet LAN has a cable length of 1 km with signal speed $2 \times 10^8$ m/s. Derive the minimum frame size equation and calculate the minimum frame size in bytes. (6 Marks)  
* **Part B (10 Marks):** CIDR Subnet Design  
  An ISP assigns the block `195.1.16.0/22`. Allocate subnets to four customers requiring:  
  - Customer 1: 500 hosts  
  - Customer 2: 250 hosts  
  - Customer 3: 120 hosts  
  - Customer 4: 60 hosts  
  Provide the network prefix, mask, and usable IP range for each customer. (10 Marks)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           ASSIGNMENT 1 MARKING RUBRIC                            │
├─────────────────────────┬──────────┬─────────────────────────────────────────────┤
│ Evaluation Criteria     │ Marks    │ Performance Thresholds                      │
├─────────────────────────┼──────────┼─────────────────────────────────────────────┤
│ Stop-and-Wait $\eta$    │ 3 Marks  │ Full credit for correct $a = T_p/T_t$ math. │
│ GBN Window & SR Bits    │ 6 Marks  │ 3 Marks for $N \ge 1+2a$; 3 for $2^m \ge 2N$.│
│ CSMA/CD Derivation      │ 6 Marks  │ 3 for $T_t \ge 2T_p$ proof; 3 for bytes.   │
│ CIDR VLSM Allocation    │ 10 Marks │ 2.5 Marks per customer: correct slash, mask,│
│                         │          │ and no overlapping boundary allocations.    │
└─────────────────────────┴──────────┴─────────────────────────────────────────────┘
```

---

### Assignment 2: IPv4 Fragmentation, Routing Protocols & TCP Congestion
* **Max Marks:** 25  
* **Mapped COs:** CO4, CO5, CO6  
* **Part A (15 Marks):** Fragmentation & Routing Updates  
  1. An IPv4 datagram with 3500 bytes of data and 20 bytes header encounters an MTU of 1000 bytes. Tabulate for every fragment: Fragment ID, Data Size, Total Length, MF flag, and Fragment Offset. (8 Marks)  
  2. Given a 4-node network running Distance Vector Routing, show the step-by-step routing table update for each node after a designated link cost doubles. (7 Marks)  
* **Part B (10 Marks):** TCP Congestion Dynamics  
  A TCP connection starts with $cwnd = 1$ MSS and $ssthresh = 32$ MSS. Trace the round-by-round $cwnd$ progression across 15 transmission rounds, assuming:  
  - Round 6 encounters a Timeout.  
  - Round 12 receives 3 Duplicate ACKs. (10 Marks)

---

## 2. Continuous Assessment Quizzes (10 Questions Each)

### Quiz 1: Reference Models, Physical Layer & Transmission Delays (CO1, CO2)
1. OSI 7-layer model functions: role of Presentation and Session layers.
2. Store-and-forward packet switching delay: transmission vs propagation delay.
3. Bandwidth-Delay Product (BDP) definition and physical interpretation.
4. Nyquist formula vs Shannon channel capacity equation.
5. Signal-to-Noise ratio conversion: $\text{SNR}_{\text{dB}} = 10 \log_{10}(\text{SNR})$.
6. Manchester line coding clock transition frequency and baud rate overhead.
7. Guided vs Unguided transmission media characteristics.
8. Single-mode vs Multi-mode optical fiber core diameters.
9. Synchronous vs Statistical Time Division Multiplexing (TDM).
10. Collision domain vs Broadcast domain partitioning across switches and routers.

### Quiz 2: Data Link Layer, Error Control & MAC Protocols (CO3, CO4)
1. Bit stuffing algorithm: framing rule for flag `01111110`.
2. CRC modulo-2 division error detection properties.
3. Hamming distance for error detection ($d+1$) vs correction ($2t+1$).
4. Stop-and-Wait ARQ efficiency equation $\eta = 1 / (1 + 2a)$.
5. Go-Back-N cumulative ACK behavior and discard of out-of-order frames.
6. Selective Repeat independent ACKs and buffering requirements.
7. Pure ALOHA (18.4%) vs Slotted ALOHA (36.8%) maximum throughput.
8. CSMA/CD minimum frame size inequality $L \ge 2 \cdot T_p \cdot B$.
9. Exponential backoff random slot range $[0, 2^k - 1]$.
10. Hidden terminal problem and RTS/CTS frames in CSMA/CA.

### Quiz 3: Network Layer, Transport Layer & Applications (CO4, CO5, CO6)
1. IPv4 header length (IHL) in 4-byte units and options field limit.
2. IPv4 fragmentation offset 8-byte scaling factor.
3. Classful vs Classless (CIDR) IP addressing.
4. Longest Prefix Matching route selection rule.
5. Distance Vector Routing Bellman-Ford equation and Count-to-Infinity.
6. Link State Routing Dijkstra shortest path algorithm.
7. TCP 3-way handshake sequence and acknowledgment numbers.
8. TCP Congestion Control: Slow Start vs Congestion Avoidance algorithms.
9. Persistent vs Non-Persistent HTTP RTT download latency.
10. DNS Iterative vs Recursive query resolution.

---

## 3. Practice Paper Question Reuse Matrix

| GATE Practice Paper Question | Question Topic & Type | Suitable University Assessment | Target University Bloom Level |
| :--- | :--- | :--- | :--- |
| **Paper 2017 Q2** | TCP 3-Way Handshake Seq/Ack (MCQ) | Quiz 3 / Mid-Term Exam (MTE) | Bloom L3 (Apply) |
| **Paper 2017 Q3** | CSMA/CD Minimum Frame Length (NAT) | Assignment 1 Part A / MTE | Bloom L4 (Analyze) |
| **Paper 2017 Q4** | IPv4 Fragmentation Offset & MF (MCQ) | Quiz 3 / Assignment 2 Part A | Bloom L4 (Analyze) |
| **Paper 2017 Q5** | TCP Congestion Window Tracking (NAT) | Assignment 2 Part B / ETE | Bloom L4 (Analyze) |
| **Paper 2018 Q2** | Non-Persistent HTTP RTT Latency (MCQ) | Quiz 3 / ETE Section A | Bloom L3 (Apply) |
| **Paper 2018 Q3** | Selective Repeat Sequence Bits (NAT) | Quiz 2 / Assignment 1 Part A | Bloom L4 (Analyze) |
| **Paper 2018 Q4** | CRC Modulo-2 Remainder (NAT) | Quiz 2 / MTE Section B | Bloom L3 (Apply) |
| **Paper 2018 Q5** | Longest Prefix Matching Interface (MCQ) | Mid-Term Exam (MTE) Section B | Bloom L4 (Analyze) |
| **Paper 2019 Q3** | CSMA/CD Maximum Cable Distance (NAT) | Assignment 1 Part A / ETE | Bloom L4 (Analyze) |
| **Paper 2019 Q4** | TCP Sequence Wrap-around Time (NAT) | Quiz 3 / ETE Section B | Bloom L4 (Analyze) |
| **Paper 2021 Q4** | Token Bucket Traffic Sizing (NAT) | Assignment 2 Part B / ETE | Bloom L4 (Analyze) |
| **Paper 2026 Q4** | TCP Reno Fast Recovery cwnd (NAT) | End-Term Exam (ETE) Section C | Bloom L4 (Analyze) |

---

# SECTION 3: 14-WEEK PREPARATION SCHEDULE (COUNTDOWN TO FEB 7, 2026)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                  14-WEEK DUAL-GOAL STUDY TIMELINE (GATE CSE + LPU)               │
├──────┬────────────────────────────────┬──────────────────┬───────────────────────┤
│ Week │ Target Subject & Unit Focus    │ LPU Continuous   │ Target GATE Practice  │
│      │                                │ Assessment Goal  │ Questions & Milestones│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W01  │ Unit 1: Protocol Layering,     │ Lab 1 Setup,     │ Master domain counts; │
│      │ OSI vs TCP/IP, Switching Delay │ Quiz 1 Prep      │ Paper 2019 Q2; 2023 Q6│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W02  │ Unit 2: Transmission Delays,   │ DPP 1 Submission │ Paper 2019 Q1;        │
│      │ BDP, Nyquist & Shannon Limits  │ Lab 2 Ping/Trace │ Paper 2026 Q6         │
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W03  │ Unit 3: Framing, Bit Stuffing, │ Assignment 1     │ Paper 2018 Q4;        │
│      │ Error Detection (CRC & Hamming)│ Part A kickoff   │ Paper 2021 Q1; 2024 Q2│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W04  │ Unit 3: Stop-and-Wait ARQ &    │ Quiz 1 Exam,     │ Paper 2017 Q1;        │
│      │ Sliding Window Protocol Math   │ DPP 2 Submission │ Paper 2020 Q1; 2022 Q3│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W05  │ Unit 3: GBN vs Selective       │ Assignment 1     │ Paper 2018 Q3;        │
│      │ Repeat Sequence Numbers        │ Part B drafting  │ Paper 2021 Q3; 2025 Q5│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W06  │ Unit 3: CSMA/CD Minimum Frame  │ Mid-Term Exam    │ Paper 2017 Q3;        │
│      │ & Binary Exponential Backoff   │ (MTE) Revision   │ Paper 2019 Q3; 2024 Q4│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W07  │ Unit 4: IPv4 Header Fields,    │ MTE Exam Week,   │ Paper 2017 Q4;        │
│      │ Packet Fragmentation & MTU     │ Lab 3 Evaluation │ Paper 2019 Q5; 2020 Q5│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W08  │ Unit 4: CIDR Subnetting (VLSM) │ Post-MTE Review, │ Paper 2018 Q5;        │
│      │ & Longest Prefix Matching      │ DPP 3 Submission │ Paper 2021 Q5; 2024 Q5│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W09  │ Unit 5: Distance Vector &      │ Assignment 2     │ Paper 2018 Q1;        │
│      │ Link State Routing Algorithms  │ Part A kickoff   │ Paper 2022 Q4; 2023 Q5│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W10  │ Unit 5: Congestion Control,    │ Quiz 2 Exam,     │ Paper 2021 Q4;        │
│      │ Token Bucket & ARP / ICMP      │ DPP 4 Submission │ Paper 2020 Q2; 2022 Q1│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W11  │ Unit 6: TCP Header, Handshake, │ Assignment 2     │ Paper 2017 Q2;        │
│      │ Sequence Number Wrap-around    │ Part B drafting  │ Paper 2019 Q4; 2023 Q1│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W12  │ Unit 6: TCP Congestion Control │ Quiz 3 Exam,     │ Paper 2017 Q5; 2020 Q4│
│      │ Slow Start, Tahoe vs Reno      │ Lab Evaluation 2 │ Paper 2021 Q2; 2026 Q4│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W13  │ Unit 6: Application Layer      │ End-Term (ETE)   │ Paper 2018 Q2; 2020 Q3│
│      │ Protocols (HTTP, DNS, SMTP)    │ Mock Exams       │ Paper 2020 Q6; 2025 Q2│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W14  │ Comprehensive 10-Paper Speed   │ ETE Final Exams, │ Final Formula Sheet   │
│      │ Run, Formula Sheet & Revision  │ GATE Hall Ticket │ Ready for Feb 7, 2026 │
└──────┴────────────────────────────────┴──────────────────┴───────────────────────┘
```
