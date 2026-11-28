# LPU CSE316: OPERATING SYSTEMS & GATE CSE MASTER GUIDE
### *Complete Curriculum-to-GATE Mapping, 10-Year Practice Papers (2017–2026), University Assessments, and Study Schedule*

---

## 1. ACADEMIC & EXAM PROFILE
* **University:** Lovely Professional University (LPU), B.Tech Computer Science and Engineering
* **Course:** CSE316 — Operating Systems (Semester 4, 3 Credits: 3-0-0)
* **Target Exam:** GATE 2026 (Computer Science & Information Technology), Section 6: Operating Systems
* **Target Exam Dates:** February 7, 8, 14, and 15, 2026 (Organizing Institute: IIT Guwahati)
* **Assessment Framework:** 2 Assignments, 3 Quizzes, 1 Mid-Term Examination (MTE), 1 End-Term Examination (ETE)

---

## 2. OFFICIAL COURSE OUTCOMES (COs)
* **CO1:** Recall and understand OS structure, functions, system software components, and process management evolution (Bloom's L1/L2).
* **CO2:** Apply CPU scheduling algorithms and use system calls to optimize and manage process execution and system resources (Bloom's L3).
* **CO3:** Analyze synchronization mechanisms, threads, and classical synchronization problems for efficient multi-threaded execution (Bloom's L4).
* **CO4:** Apply deadlock handling, protection, and security methods to ensure a threat-free system operation (Bloom's L3).
* **CO5:** Explain and analyze memory management techniques (paging, segmentation, virtual memory) for efficient address space management (Bloom's L2/L4).
* **CO6:** Classify file management, device/disk management, and inter-process communication (IPC) methods to facilitate process coordination (Bloom's L2/L3/L4).

---

## 3. 10-YEAR GATE CSE TREND SUMMARY (2017–2026)

| Core Topic Area | 10-Year Marks Average | Trend Direction | Priority Level |
| :--- | :---: | :---: | :---: |
| **CPU Scheduling** *(SRTF, Round Robin, Priority)* | **2.1 marks** | Stable (Guaranteed NAT) | **MUST-DO** |
| **Process Synchronization** *(Critical Section, Peterson's, Semaphores)* | **2.1 marks** | Rising (Heavy MSQ focus) | **MUST-DO** |
| **Memory Management** *(Paging, Multi-level Paging, TLB EMAT)* | **2.1 marks** | Stable (Guaranteed NAT) | **MUST-DO** |
| **Virtual Memory** *(Demand Paging, Page Faults: LRU, Belady's Anomaly)* | **1.5 marks** | Stable (High Yield) | **MUST-DO** |
| **Deadlocks** *(Banker's Algorithm, Safe State, Resource Invariants)* | **0.8 marks** | Stable (Regular NAT) | **GOOD-TO-DO** |
| **File Systems & Disk Scheduling** *(UNIX Inodes, SSTF, SCAN, C-LOOK)* | **1.5 marks** | Rotating (Every 1–2 years) | **GOOD-TO-DO** |
| **OS Structures, System Calls (`fork`), Threads & IPC** | **0.8 marks** | Periodic | **GOOD-TO-DO** |

---

## 4. 10 ORIGINAL PRACTICE PAPERS (2017 TO 2026) — QUESTIONS & COMPLETE SOLUTIONS

### 📄 PAPER 1 (2017 PATTERN — 6 MARKS)
1. **Q1 [1M, MCQ]:** Which instruction requires kernel mode execution?
   * *(A) Disabling timer interrupts* [CORRECT]
   * *(B) Reading current time*
   * *(C) Copying user buffers*
   * *(D) Invoking software interrupt*
   * **Solution:** Interrupt manipulation gives unchecked control of the core and can lock the system; thus, it is strictly privileged.
2. **Q2 [1M, NAT]:** Optimal Page replacement for string `1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5` with 3 frames.
   * **Answer:** `7` faults.
   * **Solution:** Initial cold misses: `1, 2, 3` (3 faults). At `4`, replace `3` (farthest future use). At `5`, replace `4`. Subsequent misses occur at `3` and `4`. Total = 7 faults.
3. **Q3 [2M, NAT]:** SRTF average waiting time for $P_1(0, 7), P_2(2, 4), P_3(4, 1), P_4(5, 4)$.
   * **Answer:** `3.00 ms`.
   * **Solution:** Gantt schedule: $P_1(0-2), P_2(2-4), P_3(4-5), P_2(5-7), P_4(7-11), P_1(11-16)$. $WT_1=9, WT_2=1, WT_3=0, WT_4=2$. Average $= 12/4 = 3.00\text{ ms}$.
4. **Q4 [2M, MCQ]:** Peterson's algorithm with `turn = i` instead of `turn = j`.
   * **Answer:** `(A) Satisfies Mutual Exclusion, but fails Progress.`
   * **Solution:** When one process finishes and the other has no interest, the interested process cannot enter if `turn` points to the other, creating a progress violation.

---

### 📄 PAPER 2 (2018 PATTERN — 8 MARKS)
1. **Q1 [1M, MCQ]:** Thread shared resources within a single process.
   * **Answer:** `(C) Heap memory and open file descriptors.`
2. **Q2 [1M, NAT]:** SSTF disk seek from cylinder 53 for requests `98, 183, 37, 122, 14, 124, 65, 67`.
   * **Answer:** `236` cylinders.
   * **Solution:** Order: $53 \to 65 \to 67 \to 37 \to 14 \to 98 \to 122 \to 124 \to 183$. Total seek $= 12+2+30+23+84+24+2+59 = 236$.
3. **Q3 [2M, NAT]:** 2-level paging EMAT ($t_{\text{mem}}=100\text{ ns}, t_{\text{tlb}}=20\text{ ns}, \text{hit}=90\%$).
   * **Answer:** `148 ns`.
   * **Solution:** $EMAT = 0.90 \times (20 + 100) + 0.10 \times (20 + 3 \times 100) = 108 + 40 = 148\text{ ns}$.
4. **Q4 [2M, NAT]:** Banker's Algorithm first executing process index in safe sequence.
   * **Answer:** `1` (Process $P_1$).
   * **Solution:** Available is $[3, 3, 4]$. Only $P_1$ (Need: $[1, 2, 2]$) and $P_3$ (Need: $[0, 1, 1]$) can proceed; $P_1$ is lexicographically first.
5. **Q5 [2M, MCQ]:** Counting semaphore with $S=10$, followed by $6\text{ P}$ and $4\text{ V}$.
   * **Answer:** `(B) 8`.
   * **Solution:** $10 - 6 + 4 = 8$.

---

### 📄 PAPER 3 (2019 PATTERN — 10 MARKS)
1. **Q1 [1M, MCQ]:** Inverted Page Table scaling property.
   * **Answer:** `(B) Each entry in the inverted page table corresponds to one page frame of physical memory.`
2. **Q2 [1M, NAT]:** Child processes created by loop `for(int i=0; i<4; i++) if(i%2==0) fork();`.
   * **Answer:** `3` child processes.
   * **Solution:** Forks execute at $i=0$ (2 processes) and $i=2$ (4 processes). Total children $= 4 - 1 = 3$.
3. **Q3 [2M, NAT]:** Round Robin average turnaround time ($P_1: 9, P_2: 4, P_3: 2$, $q=3\text{ ms}$).
   * **Answer:** `9.33 ms` ($35/3$).
   * **Solution:** Completion times: $P_3=8, P_2=12, P_1=15$. $TAT = (15 + 12 + 8)/3 = 9.33\text{ ms}$.
4. **Q4 [2M, MCQ]:** 3-process semaphore cycle output impossible prefix.
   * **Answer:** `(C) BCABC` (must strictly begin with $A$).
5. **Q5 [2M, NAT]:** UNIX Inode max file size ($4\text{ KB}$ blocks, $4\text{ B}$ pointers, 10 direct, 1 single ind, 1 double ind).
   * **Answer:** `4100 MB`.
   * **Solution:** Direct ($40\text{ KB}$) + Single Ind ($4\text{ MB}$) + Double Ind ($4096\text{ MB}$) $\approx 4100\text{ MB}$.
6. **Q6 [2M, NAT]:** Two-level paging outer bits $p_1$ for $32\text{ bit}$ address and $4\text{ KB}$ page size.
   * **Answer:** `10 bits`.
   * **Solution:** Offset $= 12\text{ b}$. Page bits $= 20\text{ b}$. Inner entries per frame $= 4\text{ KB}/4\text{ B} = 1024 = 2^{10} \implies p_2 = 10\text{ b}$. $p_1 = 20 - 10 = 10\text{ b}$.

---

### 📄 PAPER 4 (2020 PATTERN — 10 MARKS)
1. **Q1 [1M, MCQ]:** FCFS Convoy Effect characteristic.
   * **Answer:** `(A) FCFS scheduling can suffer from the convoy effect, significantly increasing average waiting time.`
2. **Q2 [1M, MCQ]:** File allocation with direct access, no external fragmentation, but pointer overhead.
   * **Answer:** `(C) Indexed allocation.`
3. **Q3 [2M, NAT]:** Max page fault rate $p$ for $EAT \le 220\text{ ns}$ ($t_{\text{mem}}=200\text{ ns}, t_{\text{fault}}=10\text{ ms}$).
   * **Answer:** `2` ($2 \times 10^{-6}$).
   * **Solution:** $200 + p(10^7) \le 220 \implies p \le 20 / 10^7 = 2 \times 10^{-6}$.
4. **Q4 [2M, NAT]:** SRTF with I/O burst completion time for $P_1$.
   * **Answer:** `9 ms`.
   * **Solution:** CPU burst 1 finishes at $3$; I/O runs from $3$ to $7$; CPU burst 2 runs from $7$ to $9$.
5. **Q5 [2M, MCQ]:** Peterson's algorithm swapping `turn` and `flag`.
   * **Answer:** `(B) Mutual Exclusion is violated.`
6. **Q6 [2M, NAT]:** SCAN disk head traversal from 50 moving towards 99 for requests `25, 40, 60, 75, 90, 10`.
   * **Answer:** `138` cylinders.
   * **Solution:** $(99 - 50) + (99 - 10) = 49 + 89 = 138$.

---

### 📄 PAPER 5 (2021 PATTERN — 7 MARKS — MSQ INTRODUCED)
1. **Q1 [1M, MCQ]:** Invalid state transition.
   * **Answer:** `(D) Waiting (Blocked) -> Running.`
2. **Q2 [2M, MSQ]:** Hardware `TestAndSet()` properties.
   * **Answer:** `(A) and (C)`.
   * **Solution:** Atomic execution in one cycle; efficient spinlocks on SMP. Does not ensure bounded waiting; wastes cycles on uniprocessors.
3. **Q3 [2M, NAT]:** Round Robin with $0.5\text{ ms}$ context switch overhead finish time of $P_3$.
   * **Answer:** `14.5 ms`.
   * **Solution:** $12\text{ ms}$ total execution time $+ 5 \times 0.5\text{ ms}$ context switches $= 14.5\text{ ms}$.
4. **Q4 [2M, NAT]:** 3-level paging $p_1$ bit length for 48-bit address, $16\text{ KB}$ page size, $8\text{ B}$ PTE.
   * **Answer:** `12 bits`.
   * **Solution:** Offset $= 14\text{ b}$. Total page bits $= 34\text{ b}$. Frame holds $16\text{ KB}/8\text{ B} = 2^{11}$ entries $\implies p_3=11, p_2=11$. $p_1 = 34 - 22 = 12\text{ b}$.

---

### 📄 PAPER 6 (2022 PATTERN — 9 MARKS)
1. **Q1 [1M, MCQ]:** Sufficient deadlock prevention condition.
   * **Answer:** `(A) Eliminating circular wait by imposing a strict linear total order on all resource requests.`
2. **Q2 [2M, MSQ]:** Page replacement algorithm characteristics.
   * **Answer:** `(A), (B), and (D)`.
3. **Q3 [2M, NAT]:** Minimum resources to guarantee deadlock-free execution for 5 processes requiring max 4 units.
   * **Answer:** `16` units.
   * **Solution:** $R_{\text{min}} = \sum (\text{Max}_i - 1) + 1 = 5 \times 3 + 1 = 16$.
4. **Q4 [2M, NAT]:** TLB EMAT with page faults ($t_{\text{tlb}}=10, t_{\text{mem}}=80, h=80\%, p=10^{-5}, t_{\text{fault}}=5\text{ ms}$).
   * **Answer:** `156.0 ns`.
5. **Q5 [2M, MCQ]:** Hard link vs Soft link metadata modifications.
   * **Answer:** `(B) hard_link.txt shares inode 2451 with link count 2; soft_link.txt has a distinct inode.`

---

### 📄 PAPER 7 (2023 PATTERN — 7 MARKS)
1. **Q1 [1M, MCQ]:** Terminated child without parent `wait()` call.
   * **Answer:** `(B) The child process enters the Zombie state.`
2. **Q2 [2M, MSQ]:** Producer-Consumer semaphore order inversion causing deadlock.
   * **Answer:** `(A) and (C)`.
   * **Solution:** Placing `wait(mutex)` outside `wait(empty/full)` blocks both processes when the buffer is empty or full.
3. **Q3 [2M, NAT]:** SRTF average turnaround time for $P_1(0, 8), P_2(1, 4), P_3(2, 2), P_4(3, 1)$.
   * **Answer:** `6.50 ms`.
4. **Q4 [2M, NAT]:** LRU page faults for 20-ref string with 4 frames.
   * **Answer:** `8` faults.

---

### 📄 PAPER 8 (2024 PATTERN — 6 MARKS)
1. **Q1 [1M, MSQ]:** Memory fragmentation and compaction properties.
   * **Answer:** `(A), (B), and (D)`.
2. **Q2 [1M, MCQ]:** Definition of an unsafe state in Banker's Algorithm.
   * **Answer:** `(B) The operating system cannot guarantee that all processes will eventually finish without entering a deadlock.`
3. **Q3 [2M, NAT]:** Minimum page table levels for 64-bit address, $8\text{ KB}$ page, $8\text{ B}$ PTE.
   * **Answer:** `6 levels`.
   * **Solution:** Offset $= 13\text{ b}$. Bits to translate $= 51\text{ b}$. Entries/frame $= 8\text{ KB}/8\text{ B} = 1024 = 2^{10} \implies \lceil 51/10 \rceil = 6\text{ levels}$.
4. **Q4 [2M, NAT]:** Preemptive priority completion time of $P_1$.
   * **Answer:** `13 ms`.

---

### 📄 PAPER 9 (2025 PATTERN — 7 MARKS)
1. **Q1 [1M, MSQ]:** Operations modifying UNIX inode metadata.
   * **Answer:** `(A) and (B)` (Data appending and `chmod`).
2. **Q2 [2M, MSQ]:** Multi-threaded race condition values for shared counter after $2 \times 100$ increments.
   * **Answer:** `(A), (B), and (C)` ($2, 100, 200$).
3. **Q3 [2M, NAT]:** SRTF total CPU idle time for $P_1(1, 4), P_2(3, 2), P_3(8, 3)$.
   * **Answer:** `2 ms` ($[0-1]$ and $[7-8]$).
4. **Q4 [2M, NAT]:** Single-level TLB EMAT ($t_{\text{tlb}}=15, t_{\text{mem}}=90, h=95\%$).
   * **Answer:** `109.5 ns`.

---

### 📄 PAPER 10 (2026 PATTERN — 8 MARKS — PREDICTIVE)
1. **Q1 [1M, MCQ]:** Thrashing recovery action.
   * **Answer:** `(B) Suspend (swap out) one or more active processes.`
2. **Q2 [1M, NAT]:** Inode capacity with $2\text{ KB}$ blocks, $4\text{ B}$ pointers, 8 direct, 1 single, 1 double ind.
   * **Answer:** `513 MB`.
3. **Q3 [2M, MSQ]:** Priority Inversion, RR, and SJF theorems.
   * **Answer:** `(A), (C), and (D)`.
4. **Q4 [2M, NAT]:** Minimum unallocated units for Banker's Algorithm safe state.
   * **Answer:** `2` units (satisfies smallest need of $P_1$).
5. **Q5 [2M, NAT]:** C-LOOK cylinder head traversal from 50 moving up.
   * **Answer:** `322` cylinders.

---

## 5. UNIVERSITY ASSIGNMENTS & MARKING SCHEMES
* **Assignment 1 (Core Process Engineering & Concurrency — 30 Marks):** Due Week 5.
  * Q1: `fork()` process hierarchy tree & execution tracing (6 Marks).
  * Q2: Preemptive SRTF vs Round Robin with context switch latency (10 Marks).
  * Q3: Critical section proof & progress flaw counterexample (8 Marks).
  * Q4: Banker's Algorithm safety matrix & request evaluation (6 Marks).
* **Assignment 2 (Memory Hierarchy, Storage & Security — 30 Marks):** Due Week 11.
  * Q1: 48-bit multi-level paging bit derivation and TLB EMAT (8 Marks).
  * Q2: Belady's anomaly demonstration with LRU immunity proof (8 Marks).
  * Q3: UNIX Inode capacity & block access sequence calculation (7 Marks).
  * Q4: SSTF vs SCAN vs C-LOOK disk seek simulation (7 Marks).

---

## 6. CONTINUOUS ASSESSMENT QUIZZES
* **Quiz 1 (Units 1 & 2):** 10 Questions, 10 Marks. Covers OS structures, dual-mode execution, CPU scheduling, thread models.
* **Quiz 2 (Units 3 & 4):** 10 Questions, 10 Marks. Covers critical sections, Peterson's algorithm, semaphores, Banker's algorithm, paging EMAT.
* **Quiz 3 (Units 5 & 6):** 10 Questions, 10 Marks. Covers virtual memory, page replacement algorithms, UNIX Inodes, disk scheduling, IPC.

---

## 7. 14-WEEK STUDY SCHEDULE (COUNTDOWN TO FEB 7, 2026)
* **Weeks 1–4:** OS Fundamentals, Process Lifecycle, and CPU Scheduling (Quiz 1 & Assignment 1 Draft).
* **Weeks 5–7:** Process Synchronization, Concurrency, and Deadlocks (Assignment 1 Final, Quiz 2, Mid-Term Exam).
* **Weeks 8–10:** Main Memory Paging, TLB, Virtual Memory, and Page Replacement (Quiz 3).
* **Weeks 11–12:** File Systems, UNIX Inodes, Disk Scheduling, and IPC (Assignment 2, University End-Term Exam).
* **Weeks 13–14:** Full-Length GATE CSE Mock Tests, PyQ Speed Drills, and MSQ Elimination Sprint.
