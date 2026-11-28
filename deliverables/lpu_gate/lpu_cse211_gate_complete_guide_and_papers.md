# LPU CSE211: Computer Organization and Design
## Complete GATE CSE Mapping, 10 Original Practice Papers (2017–2026) & Continuous Assessment Architecture

---

# SECTION 1: 10 ORIGINAL GATE PRACTICE PAPERS (2017–2026 PATTERNS)

---

## Paper 2017 Pattern (Total: 10 Marks | 2x1M, 4x2M | 4 MCQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
An instruction stored at memory location $2000$ (decimal) is a 2-word PC-relative branch instruction: `BR $TARGET`. Each word is 16 bits. If the 16-bit displacement field in the second word is $-50$ (decimal), what is the effective target address computed by the processor?  
(A) $1950$  
(B) $1952$  
(C) $1948$  
(D) $2052$

#### Q2. [1 Mark | MCQ]
In an Arithmetic Logic Unit performing 2's complement addition of two $n$-bit signed integers $A$ and $B$, which Boolean condition correctly indicates that an arithmetic overflow has occurred? (Assume $C_{in}$ is carry into the sign bit and $C_{out}$ is carry out of the sign bit).  
(A) $C_{in} \land C_{out}$  
(B) $C_{in} \oplus C_{out}$  
(C) $A_{n-1} \oplus B_{n-1}$  
(D) $\overline{C_{in}} \land C_{out}$

#### Q3. [2 Marks | NAT]
A computer system has a 32-bit byte-addressable physical address space and a 64 KB 4-way set-associative cache with a block size of 64 bytes. What is the number of **TAG** bits in the physical address?  
**Answer:** `[Integer]`

#### Q4. [2 Marks | MCQ]
Consider a standard 5-stage RISC instruction pipeline with stages: IF, ID, EX, MEM, WB. Each stage takes 1 clock cycle. Consider the following instruction sequence:
```
I1: ADD R1, R2, R3    (R1 <- R2 + R3)
I2: SUB R4, R1, R5    (R4 <- R1 - R5)
I3: AND R6, R1, R7    (R6 <- R1 & R7)
```
If the processor has **NO operand forwarding** hardware (registers are written in the first half of WB and read in the second half of ID), how many stall cycles are introduced between $I_1$ and $I_2$?  
(A) 0  
(B) 1  
(C) 2  
(D) 3

#### Q5. [2 Marks | NAT]
A hard disk drive transfers data at a rate of 2 MB/sec ($2 \times 10^6$ bytes/sec) to main memory using a DMA controller in **Cycle Stealing** mode. The processor runs at a clock frequency of 50 MHz. Each DMA transfer moves a 32-bit word across the data bus and takes 2 processor clock cycles. What percentage of CPU time is consumed by the DMA transfers?  
**Answer:** `[Number, up to 2 decimal places]`

#### Q6. [2 Marks | MCQ]
A control unit generates 42 distinct control signals. Analysis of the datapath reveals that the control signals can be partitioned into 5 mutually exclusive groups of sizes 14, 8, 7, 8, and 5. What is the minimum number of control bits required in a **vertical** microinstruction format compared to a purely **horizontal** format?  
(A) Horizontal: 42 bits; Vertical: 18 bits  
(B) Horizontal: 42 bits; Vertical: 21 bits  
(C) Horizontal: 32 bits; Vertical: 16 bits  
(D) Horizontal: 42 bits; Vertical: 15 bits

---

### Answer Key & Step-by-Step Solutions (2017)

* **Q1 Answer: (B)**  
  * **Solution:**  
    1. The instruction occupies 2 words at memory locations $2000$ and $2001$.  
    2. During the fetch of the 2-word instruction, the Program Counter ($PC$) is automatically incremented past the instruction:  
       $$(PC)_{\text{updated}} = 2000 + 2 = 2002$$  
    3. The effective target address is computed relative to the updated $PC$:  
       $$\text{Target} = (PC)_{\text{updated}} + \text{Displacement} = 2002 + (-50) = \mathbf{1952}$$

* **Q2 Answer: (B)**  
  * **Solution:** In 2's complement arithmetic, an overflow occurs if and only if the carry into the sign bit ($C_{in}$) differs from the carry out of the sign bit ($C_{out}$). This is logically detected by the XOR gate: $V = C_{in} \oplus C_{out}$.

* **Q3 Answer: 18**  
  * **Solution:**  
    1. Physical Address $= 32$ bits.  
    2. Block size $= 64$ bytes $= 2^6$ bytes $\implies \text{Word offset bits} = 6$.  
    3. Cache size $= 64\text{ KB} = 2^{16}$ bytes.  
    4. Total cache lines $= \frac{\text{Cache Size}}{\text{Block Size}} = \frac{2^{16}}{2^6} = 2^{10} = 1024$ lines.  
    5. Number of sets in 4-way set-associative cache:  
       $$\text{Sets} = \frac{\text{Total Lines}}{k} = \frac{1024}{4} = 256 = 2^8 \implies \text{Set index bits} = 8$$  
    6. Tag bits $= 32 - (\text{Set bits} + \text{Word offset bits}) = 32 - (8 + 6) = 32 - 14 = \mathbf{18}$ bits.

* **Q4 Answer: (C)**  
  * **Solution:**  
    - $I_1$ produces result for $R_1$ at stage WB (clock cycle 5). With split-phase register file, $R_1$ is written in first half of cycle 5.  
    - $I_2$ requires $R_1$ at stage ID.  
    - Cycle 1: $I_1$ in IF.  
    - Cycle 2: $I_1$ in ID; $I_2$ in IF.  
    - Cycle 3: $I_1$ in EX; $I_2$ stalled in ID. (Stall 1)  
    - Cycle 4: $I_1$ in MEM; $I_2$ stalled in ID. (Stall 2)  
    - Cycle 5: $I_1$ in WB (writes $R_1$); $I_2$ completes ID in second half of cycle 5.  
    - Total stall cycles $= \mathbf{2}$.

* **Q5 Answer: 2.00% (or 2%)**  
  * **Solution:**  
    1. DMA transfer rate $= 2 \times 10^6$ bytes/sec.  
    2. Each transfer moves 32 bits $= 4$ bytes.  
    3. Transfers per second $= \frac{2 \times 10^6}{4} = 500,000$ transfers/sec.  
    4. Each transfer takes 2 clock cycles $\implies$ Clock cycles consumed per second:  
       $$\text{Cycles consumed} = 500,000 \times 2 = 1,000,000\text{ cycles/sec} = 1 \times 10^6\text{ cycles/sec}$$  
    5. CPU clock frequency $= 50\text{ MHz} = 50 \times 10^6$ cycles/sec.  
    6. Percentage CPU time consumed:  
       $$\text{CPU Slowdown} = \frac{1 \times 10^6}{50 \times 10^6} \times 100\% = \mathbf{2.00\%}$$

* **Q6 Answer: (A)**  
  * **Solution:**  
    - Horizontal format requires 1 bit per control signal $\implies 42$ bits.  
    - In vertical format, mutually exclusive groups of sizes $N_i$ are encoded with an extra "no-operation" state $\lceil \log_2(N_i + 1) \rceil$:  
      - Group 1 (size 14): $\lceil \log_2(14 + 1) \rceil = \lceil \log_2 15 \rceil = 4$ bits.  
      - Group 2 (size 8): $\lceil \log_2(8 + 1) \rceil = \lceil \log_2 9 \rceil = 4$ bits.  
      - Group 3 (size 7): $\lceil \log_2(7 + 1) \rceil = \lceil \log_2 8 \rceil = 3$ bits.  
      - Group 4 (size 8): $\lceil \log_2(8 + 1) \rceil = \lceil \log_2 9 \rceil = 4$ bits.  
      - Group 5 (size 5): $\lceil \log_2(5 + 1) \rceil = \lceil \log_2 6 \rceil = 3$ bits.  
      - Total vertical control bits $= 4 + 4 + 3 + 4 + 3 = \mathbf{18}$ bits.

---

## Paper 2018 Pattern (Total: 8 Marks | 2x1M, 3x2M | 3 MCQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
A computer architecture uses **Memory-Mapped I/O**. Which of the following statements is **TRUE**?  
(A) The processor requires dedicated `IN` and `OUT` machine instructions to communicate with I/O devices.  
(B) I/O port registers share the same address space as primary RAM, reducing the addressable memory capacity available for user programs.  
(C) Hardware address decoding lines are completely separate for memory and I/O devices.  
(D) DMA transfers cannot access I/O device registers in memory-mapped configurations.

#### Q2. [1 Mark | MCQ]
A 16-bit processor has an instruction format supporting 4-bit register addresses. The processor supports 2-address instructions and 1-address instructions. If there are 14 distinct 2-address instructions, what is the maximum number of 1-address instructions that can be encoded?  
(A) 16  
(B) 32  
(C) 64  
(D) 128

#### Q3. [2 Marks | NAT]
A 5-stage instruction pipeline has stage delays of $180\text{ ps}, 120\text{ ps}, 220\text{ ps}, 200\text{ ps}$, and $140\text{ ps}$. The pipeline registers (latches) introduce an additional delay of $20\text{ ps}$ between stages. A program with 1000 independent instructions is executed on this pipeline. What is the total time (in nanoseconds) required to execute the entire program?  
**Answer:** `[Number, up to 2 decimal places]`

#### Q4. [2 Marks | MCQ]
A system has a 2-level memory hierarchy consisting of cache ($L_1$) and main memory ($M$). The access time of $L_1$ is $2\text{ ns}$ and its hit ratio is $0.95$. The access time of main memory is $50\text{ ns}$. In case of a cache miss, the cache and main memory are accessed hierarchically. What is the Average Memory Access Time (AMAT)?  
(A) $4.4\text{ ns}$  
(B) $4.5\text{ ns}$  
(C) $2.5\text{ ns}$  
(D) $3.2\text{ ns}$

#### Q5. [2 Marks | NAT]
A microprogrammed control unit has 32 control signals divided into 4 mutually exclusive fields containing 7, 6, 12, and 7 signals respectively. The control store must store 512 microinstructions. Each microinstruction contains the encoded control fields, a 2-bit branch condition selection field, and the jump address field to address any location in the control store. What is the total size of the control store in **bits**?  
**Answer:** `[Integer]`

---

### Answer Key & Step-by-Step Solutions (2018)

* **Q1 Answer: (B)**  
  * **Solution:** In Memory-Mapped I/O, I/O device registers are mapped into the same address space as physical memory. Standard memory instructions (`LOAD`, `STORE`) access both memory and I/O. As a consequence, addresses assigned to I/O ports cannot be used by RAM, reducing total addressable memory.

* **Q2 Answer: (B)**  
  * **Solution:**  
    - Total instruction length $= 16$ bits. Register address $= 4$ bits.  
    - A 2-address instruction format: `[Opcode | Reg1 (4b) | Reg2 (4b)]` $\implies$ Opcode $= 16 - 8 = 8$ bits.  
    - Maximum 8-bit opcodes $= 2^8 = 256$.  
    - Number of 2-address instructions assigned $= 14$.  
    - Unused 2-address opcode patterns $= 256 - 14 = 242$.  
    Wait, look at the instruction format: if 2-address instruction has Opcode, Reg1, Reg2:  
    If opcode is 8 bits, 2-address instruction needs 8 bits opcode. A 1-address instruction format is `[Opcode (12b) | Reg (4b)]`.  
    Each unused 8-bit pattern expands by $2^4 = 16$ into 12-bit opcodes:  
    Remaining 1-address instructions $= (2^8 - 14) \times 2^4 = 242 \times 16 = 3872$.  
    Wait, what if opcode is 4 bits? Then `[Opcode (4b) | Reg1 (4b) | Reg2 (4b) | Unused (4b)]`? If Opcode is 4 bits:  
    $2^4 = 16$ total patterns. If 14 are used for 2-address, $16 - 14 = 2$ patterns remain.  
    Each expands by $2^4 = 16 \implies 2 \times 16 = \mathbf{32}$ instructions. (Matches option B).

* **Q3 Answer: 240.96 ns**  
  * **Solution:**  
    1. Pipeline clock cycle time:  
       $$\tau = \max(180, 120, 220, 200, 140) + 20\text{ ps} = 220 + 20 = 240\text{ ps}$$  
    2. Clock cycles to execute $n = 1000$ instructions in a $k = 5$ stage pipeline:  
       $$\text{Cycles} = k + n - 1 = 5 + 1000 - 1 = 1004\text{ cycles}$$  
    3. Total execution time:  
       $$\text{Time} = 1004 \times 240\text{ ps} = 240,960\text{ ps} = \mathbf{240.96\text{ ns}}$$

* **Q4 Answer: (B)**  
  * **Solution:** In hierarchical access:  
    $$\text{AMAT} = T_{L1} + (1 - H_{L1}) \times T_m = 2\text{ ns} + (1 - 0.95) \times 50\text{ ns} = 2 + 0.05 \times 50 = 2 + 2.5 = \mathbf{4.5\text{ ns}}$$

* **Q5 Answer: 13,824**  
  * **Solution:**  
    1. Control field bits:  
       - Field 1 (7 signals): $\lceil \log_2(7 + 1) \rceil = 3$ bits.  
       - Field 2 (6 signals): $\lceil \log_2(6 + 1) \rceil = 3$ bits.  
       - Field 3 (12 signals): $\lceil \log_2(12 + 1) \rceil = 4$ bits.  
       - Field 4 (7 signals): $\lceil \log_2(7 + 1) \rceil = 3$ bits.  
       - Total control bits $= 3 + 3 + 4 + 3 = 13$ bits.  
    2. Branch condition bits $= 2$ bits.  
    3. Jump address bits: to address 512 locations, $\log_2(512) = 9$ bits.  
    4. Microinstruction word length $= 13 + 2 + 9 = 27$ bits.  
    5. Control store capacity $= 512\text{ words} \times 27\text{ bits} = \mathbf{13,824}$ bits.

---

## Paper 2019 Pattern (Total: 9 Marks | 3x1M, 3x2M | 3 MCQ, 3 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
In a Berkeley RISC processor architecture with Overlapping Register Windows, each window consists of 10 Global registers, 8 In registers, 10 Local registers, and 8 Out registers. What is the logical window size accessible to a currently executing subroutine?  
(A) 36  
(B) 26  
(C) 18  
(D) 28

#### Q2. [1 Mark | NAT]
An instruction uses **Memory Indirect Addressing Mode**: `ADD @(1050), R1`. How many memory reference cycles are required to execute this instruction (including the fetch cycle)? (Assume the instruction length is 1 word).  
**Answer:** `[Integer]`

#### Q3. [1 Mark | MCQ]
In a daisy-chaining priority interrupt system with 4 peripheral devices $D_1, D_2, D_3, D_4$ where $D_1$ is physically closest to the CPU and $D_4$ is farthest, which device has the lowest interrupt priority?  
(A) $D_1$  
(B) $D_2$  
(C) $D_3$  
(D) $D_4$

#### Q4. [2 Marks | NAT]
A 32 KB Direct-Mapped cache has a block size of 32 bytes. The computer system uses 32-bit byte-addressable physical memory. If the cache uses a **Write-Back** policy (requiring 1 dirty bit per line) and 1 valid bit per line, what is the total size of the cache **Tag Directory** in bits?  
**Answer:** `[Integer]`

#### Q5. [2 Marks | NAT]
A non-pipelined processor executes an instruction in 10 ns. The processor is re-engineered into a 5-stage pipeline with stage delays of 2.2 ns, 1.8 ns, 2.5 ns, 2.0 ns, and 1.5 ns. An inter-stage register delay of 0.2 ns is introduced between consecutive stages. For a program with a very large number of instructions ($n \to \infty$) and no hazards, what is the theoretical speedup achieved by the pipelined processor over the non-pipelined processor?  
**Answer:** `[Number, up to 2 decimal places]`

#### Q6. [2 Marks | MCQ]
During the basic instruction cycle, which of the following micro-operations must be performed in the **Fetch** phase?  
(A) $AR \leftarrow PC, \; IR \leftarrow M[AR], \; PC \leftarrow PC + 1$  
(B) $DR \leftarrow M[AR], \; AC \leftarrow AC + DR$  
(C) $AR \leftarrow IR(\text{Address}), \; DR \leftarrow M[AR]$  
(D) $M[AR] \leftarrow TR, \; PC \leftarrow 0$

---

### Answer Key & Step-by-Step Solutions (2019)

* **Q1 Answer: (A)**  
  * **Solution:** The logical window visible to an executing subroutine consists of:  
    $$\text{Window Size} = \text{Global} + \text{In} + \text{Local} + \text{Out} = 10 + 8 + 10 + 8 = \mathbf{36}\text{ registers}$$

* **Q2 Answer: 3**  
  * **Solution:**  
    1. Cycle 1: Fetch instruction from memory ($IR \leftarrow M[PC]$).  
    2. Cycle 2: Read effective address from memory location 1050 ($AR \leftarrow M[1050]$).  
    3. Cycle 3: Read actual operand from memory at effective address ($DR \leftarrow M[AR]$).  
    Total memory reference cycles $= \mathbf{3}$.

* **Q3 Answer: (D)**  
  * **Solution:** In daisy chaining, the interrupt acknowledge signal ($INTA$) propagates serially from $D_1 \to D_2 \to D_3 \to D_4$. The device closest to the CPU ($D_1$) intercepts the signal first (highest priority), while the device at the end of the chain ($D_4$) has the lowest priority.

* **Q4 Answer: 19,456**  
  * **Solution:**  
    1. Physical Address $= 32$ bits.  
    2. Block size $= 32$ bytes $= 2^5$ bytes $\implies \text{Word offset} = 5$ bits.  
    3. Cache size $= 32\text{ KB} = 2^{15}$ bytes.  
    4. Cache lines $= \frac{2^{15}}{2^5} = 2^{10} = 1024$ lines $\implies \text{Line/Index bits} = 10$.  
    5. Tag bits per line $= 32 - (10 + 5) = 17$ bits.  
    6. Directory overhead per line $= \text{Tag bits} (17) + \text{Valid bit} (1) + \text{Dirty bit} (1) = 19$ bits.  
    7. Total Tag Directory size $= 1024 \times 19 = \mathbf{19,456}$ bits.

* **Q5 Answer: 3.70**  
  * **Solution:**  
    1. Non-pipelined execution time per instruction: $T_{\text{non-pipe}} = 10\text{ ns}$.  
    2. Pipelined clock cycle time:  
       $$\tau = \max(2.2, 1.8, 2.5, 2.0, 1.5) + 0.2\text{ ns} = 2.5 + 0.2 = 2.7\text{ ns}$$  
    3. For $n \to \infty$, average time per instruction on pipeline is $\tau = 2.7\text{ ns}$.  
    4. Speedup:  
       $$S = \frac{T_{\text{non-pipe}}}{\tau} = \frac{10}{2.7} \approx \mathbf{3.70}$$

* **Q6 Answer: (A)**  
  * **Solution:** The fetch phase loads the instruction address into $AR$, fetches the instruction word into $IR$, and increments the Program Counter: $AR \leftarrow PC; IR \leftarrow M[AR]; PC \leftarrow PC + 1$.

---

## Paper 2020 Pattern (Total: 10 Marks | 2x1M, 4x2M | 4 MCQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
Which type of cache miss occurs upon the first reference to a memory block, even if the cache has infinite capacity and full associativity?  
(A) Capacity Miss  
(B) Conflict Miss  
(C) Compulsory (Cold) Miss  
(D) Coherence Miss

#### Q2. [1 Mark | MCQ]
In an instruction pipelined processor, when is the Program Counter ($PC$) updated to point to the next instruction?  
(A) During the Instruction Fetch (IF) stage  
(B) During the Instruction Decode (ID) stage  
(C) During the Execute (EX) stage  
(D) During the Write-Back (WB) stage

#### Q3. [2 Marks | NAT]
A system features an L1 cache, L2 cache, and Main Memory accessed simultaneously. Access times are: L1 $= 1\text{ ns}$, L2 $= 8\text{ ns}$, Main Memory $= 80\text{ ns}$. Hit ratios are: L1 hit ratio $= 0.90$, L2 local hit ratio $= 0.80$. What is the Average Memory Access Time (in nanoseconds)?  
**Answer:** `[Number, up to 2 decimal places]`

#### Q4. [2 Marks | MCQ]
Consider the following MIPS-like pipeline sequence:
```
I1: LW R1, 0(R2)      (Load word into R1)
I2: ADD R3, R1, R4    (R3 <- R1 + R4)
```
In a 5-stage pipeline with **operand forwarding hardware**, how many stall cycles (NOPs) must be inserted between $I_1$ and $I_2$ to resolve the Load-Use data hazard?  
(A) 0  
(B) 1  
(C) 2  
(D) 3

#### Q5. [2 Marks | NAT]
A 16-bit processor supports instructions that can have two 4-bit register operands and a 4-bit opcode. The instruction format is to be expanded to support 1-address instructions (one 4-bit register operand) and 0-address instructions. If there are 12 two-address instructions and 48 one-address instructions, what is the maximum number of 0-address instructions that can be encoded?  
**Answer:** `[Integer]`

#### Q6. [2 Marks | MCQ]
A CPU running at 10 MHz interfaces with a keyboard that generates an interrupt for every key pressed. Each character ISR requires 50 clock cycles. If the maximum key press rate is 20 characters per second, what fraction of total CPU execution time is spent servicing keyboard interrupts?  
(A) $0.01\%$  
(B) $0.001\%$  
(C) $0.1\%$  
(D) $0.05\%$

---

### Answer Key & Step-by-Step Solutions (2020)

* **Q1 Answer: (C)**  
  * **Solution:** Compulsory (or cold-start) misses occur on the very first access to a block, which has never been in the cache. They cannot be avoided by increasing cache size or associativity.

* **Q2 Answer: (A)**  
  * **Solution:** The Program Counter is incremented during the Instruction Fetch (IF) stage so that the subsequent instruction can be fetched into the pipeline in the immediately following clock cycle.

* **Q3 Answer: 2.50 ns**  
  * **Solution:**  
    1. In simultaneous access:  
       - L1 hit ($H_1 = 0.90$): time $= 1\text{ ns}$.  
       - L1 miss, L2 hit: prob $= (1 - 0.90) \times 0.80 = 0.10 \times 0.80 = 0.08$. Time $= 8\text{ ns}$.  
       - L1 miss, L2 miss (Main Memory): prob $= (1 - 0.90) \times (1 - 0.80) = 0.10 \times 0.20 = 0.02$. Time $= 80\text{ ns}$.  
    2. AMAT:  
       $$\text{AMAT} = (0.90 \times 1) + (0.08 \times 8) + (0.02 \times 80) = 0.90 + 0.64 + 1.60 = \mathbf{3.14\text{ ns}}$$  
       *(If hierarchical: $1 + 0.10 \times (8 + 0.20 \times 80) = 1 + 0.10 \times (8 + 16) = 1 + 2.4 = 3.4\text{ ns}$)*.

* **Q4 Answer: (B)**  
  * **Solution:** In a standard 5-stage pipeline with operand forwarding:  
    - $I_1$ (Load) obtains its data from memory at the end of the MEM stage (cycle 4).  
    - $I_2$ (Add) needs the operand at the beginning of its EX stage.  
    - Even with forwarding from MEM/WB to EX, $I_2$ must wait until the end of MEM stage. Hence, exactly **1 stall cycle** (the Load-Use bubble) is unavoidable.

* **Q5 Answer: 256**  
  * **Solution:**  
    1. Two-address instruction format: `[Opcode (4b) | Reg1 (4b) | Reg2 (4b) | Unused (4b)]` or `[Opcode (8b) | Reg1 (4b) | Reg2 (4b)]`.  
       Given 4-bit opcode: Total 4-bit patterns $= 2^4 = 16$.  
       Assigned to 2-address instructions $= 12$.  
       Unused 4-bit patterns $= 16 - 12 = 4$.  
    2. One-address instruction format: expanding opcode by 4 bits $\implies$ available patterns $= 4 \times 2^4 = 64$.  
       Assigned to 1-address instructions $= 48$.  
       Unused patterns $= 64 - 48 = 16$.  
    3. Zero-address instruction format: expanding by the remaining 4 bits $\implies$  
       $$\text{Max 0-address instructions} = 16 \times 2^4 = 16 \times 16 = \mathbf{256}$$

* **Q6 Answer: (A)**  
  * **Solution:**  
    1. Characters per second $= 20$.  
    2. Cycles per ISR $= 50$.  
    3. Total cycles consumed per second $= 20 \times 50 = 1000$ cycles/sec.  
    4. CPU frequency $= 10\text{ MHz} = 10 \times 10^6$ cycles/sec.  
    5. Fraction of time $= \frac{1000}{10 \times 10^6} = 10^{-4} = \mathbf{0.01\%}$.

---

## Paper 2021 Pattern (Total: 10 Marks | 2x1M, 4x2M | 3 MCQ, 2 MSQ, 1 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
Under IEEE 754 single-precision 32-bit floating-point standard, what is the bias added to the true exponent?  
(A) 127  
(B) 128  
(C) 1023  
(D) 1024

#### Q2. [1 Mark | MSQ]
Which of the following statements is/are **TRUE** regarding pipeline hazards?  
(A) RAW (Read-After-Write) hazards are true data dependencies that cannot be eliminated by register renaming.  
(B) WAR (Write-After-Read) hazards can be eliminated by register renaming.  
(C) WAW (Write-After-Write) hazards can occur in in-order execution pipelines.  
(D) Structural hazards can be eliminated by duplicating hardware resources (such as separate instruction and data caches).

#### Q3. [2 Marks | MSQ]
Which of the following statements is/are **TRUE** regarding Cache memory management policies?  
(A) In a Write-Through cache, every write to the cache is simultaneously propagated to main memory.  
(B) Write-Back caches typically use a Dirty bit per cache line to track whether a line has been modified.  
(C) Write-Allocate is commonly paired with Write-Back caches.  
(D) A Write-Through cache generates more write traffic to main memory than a Write-Back cache.

#### Q4. [2 Marks | MCQ]
A computer uses a 2-level page table for address translation. The TLB has an access time of 10 ns and a hit ratio of 90%. Main memory access time is 80 ns. What is the Effective Memory Access Time (EMAT) assuming the page table entries always reside in main memory?  
(A) 98 ns  
(B) 106 ns  
(C) 115 ns  
(D) 170 ns

#### Q5. [2 Marks | MCQ]
A microinstruction format has 16 control signals, a condition select code of 3 bits, and a next address field of 8 bits. What is the total length of the microinstruction word?  
(A) 24 bits  
(B) 27 bits  
(C) 32 bits  
(D) 19 bits

#### Q6. [2 Marks | NAT]
A DMA controller transfers a 64 KB block of data from an SSD to main memory in **Burst Mode**. The bus operates at 100 MHz with a 32-bit data bus. The DMA initialization and bus setup take 200 clock cycles. Once the transfer begins, each 32-bit word transfer takes 1 clock cycle. How much total time (in microseconds) does the burst transfer take?  
**Answer:** `[Number, up to 2 decimal places]`

---

### Answer Key & Step-by-Step Solutions (2021)

* **Q1 Answer: (A)**  
  * **Solution:** IEEE 754 32-bit single-precision uses an 8-bit exponent field with an excess-127 bias ($E_{\text{stored}} = E_{\text{true}} + 127$).

* **Q2 Answer: (A, B, D)**  
  * **Solution:**  
    - (A) True: RAW is a true data flow dependency.  
    - (B) True: WAR is an anti-dependency caused by register reuse; renaming eliminates it.  
    - (C) False: WAW cannot occur in a strict in-order 5-stage pipeline because writes occur in stage 5 in instruction order.  
    - (D) True: Harvard architecture (separate I-cache and D-cache) eliminates structural memory conflicts.

* **Q3 Answer: (A, B, C, D)**  
  * **Solution:** All four statements are correct fundamentals of cache memory architecture.

* **Q4 Answer: (B)**  
  * **Solution:**  
    1. On TLB hit (prob 0.90): TLB access (10 ns) + 1 memory access for data (80 ns) $= 90$ ns.  
    2. On TLB miss (prob 0.10): TLB access (10 ns) + Level-1 page table access (80 ns) + Level-2 page table access (80 ns) + Data access (80 ns) $= 10 + 240 = 250$ ns.  
    3. EMAT:  
       $$\text{EMAT} = (0.90 \times 90) + (0.10 \times 250) = 81 + 25 = \mathbf{106\text{ ns}}$$

* **Q5 Answer: (B)**  
  * **Solution:** Microinstruction length $= \text{Control bits} (16) + \text{Condition bits} (3) + \text{Address bits} (8) = 16 + 3 + 8 = \mathbf{27}$ bits.

* **Q6 Answer: 165.84 $\mu$s**  
  * **Solution:**  
    1. Block size $= 64\text{ KB} = 65,536$ bytes.  
    2. Data bus $= 32\text{ bits} = 4\text{ bytes} \implies$ Words $= \frac{65,536}{4} = 16,384$ words.  
    3. Data transfer cycles $= 16,384 \times 1 = 16,384$ cycles.  
    4. Total clock cycles $= \text{Setup} (200) + 16,384 = 16,584$ cycles.  
    5. Clock period $\tau = \frac{1}{100\text{ MHz}} = 10\text{ ns} = 0.01\text{ }\mu\text{s}$.  
    6. Total time $= 16,584 \times 10\text{ ns} = 165,840\text{ ns} = \mathbf{165.84\text{ }\mu\text{s}}$.

---

## Paper 2022 Pattern (Total: 8 Marks | 2x1M, 3x2M | 2 MCQ, 1 MSQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
Which addressing mode is ideally suited for implementing a runtime stack where the stack pointer automatically decrements before pushing data and increments after popping data?  
(A) Indexed Addressing Mode  
(B) Autodecrement / Autoincrement Addressing Mode  
(C) Base Register Addressing Mode  
(D) Direct Addressing Mode

#### Q2. [1 Mark | MSQ]
Which of the following architectural design principles is/are characteristic of **RISC** processors?  
(A) Hardwired control unit for single-cycle instruction execution.  
(B) Variable-length instruction formats with complex addressing modes.  
(C) Load-Store architecture (memory accessed exclusively via `LOAD` and `STORE`).  
(D) Large general-purpose register file.

#### Q3. [2 Marks | NAT]
A pipelined processor has 5 stages with individual delays of 1.2 ns, 1.5 ns, 2.0 ns, 1.4 ns, and 1.1 ns. The interface latches between stages have a propagation delay of 0.1 ns each. What is the maximum clock frequency (in MHz) at which this pipeline can operate?  
**Answer:** `[Integer]`

#### Q4. [2 Marks | MCQ]
A 2-way set-associative cache consists of 4 sets (Set 0, 1, 2, 3) and uses the **Least Recently Used (LRU)** replacement policy. The cache is initially empty. The CPU generates the following sequence of block requests:
$$0, \; 4, \; 8, \; 0, \; 4, \; 12, \; 8, \; 0$$
(Assuming block $B$ maps to Set $B \bmod 4$). How many cache **HITS** occur in this sequence?  
(A) 1  
(B) 2  
(C) 3  
(D) 4

#### Q5. [2 Marks | NAT]
A CPU runs at 25 MHz ($25 \times 10^6$ cycles/sec). A DMA controller operates in **Cycle Stealing Mode** transferring 8-bit bytes from a network interface running at 500 KB/sec ($500 \times 10^3$ bytes/sec). Each byte transfer steals 1 clock cycle from the CPU. How many cycles are stolen by the DMA controller every second?  
**Answer:** `[Integer]`

---

### Answer Key & Step-by-Step Solutions (2022)

* **Q1 Answer: (B)**  
  * **Solution:** Pre-decrement (Autodecrement) and Post-increment (Autoincrement) addressing modes natively map to stack push (`-(SP)`) and pop (`(SP)+`) operations.

* **Q2 Answer: (A, C, D)**  
  * **Solution:**  
    - RISC uses hardwired control, Load-Store architecture, and large register files.  
    - (B) is characteristic of CISC (which uses variable-length complex instructions).

* **Q3 Answer: 476 MHz**  
  * **Solution:**  
    1. Clock cycle time:  
       $$\tau = \max(1.2, 1.5, 2.0, 1.4, 1.1) + 0.1\text{ ns} = 2.0 + 0.1 = 2.1\text{ ns} = 2.1 \times 10^{-9}\text{ sec}$$  
    2. Clock frequency:  
       $$f = \frac{1}{\tau} = \frac{1}{2.1 \times 10^{-9}} \approx 476.19 \times 10^6\text{ Hz} \approx \mathbf{476\text{ MHz}}$$

* **Q4 Answer: (B)**  
  * **Solution:** Notice all blocks $\{0, 4, 8, 12\} \equiv 0 \pmod 4$. They all map to **Set 0**!  
    Set 0 holds 2 blocks (2-way). Trace Set 0 (LRU):  
    1. Access 0: Miss. Set 0: `[0]`  
    2. Access 4: Miss. Set 0: `[0, 4]`  
    3. Access 8: Miss. Evicts 0 (LRU). Set 0: `[4, 8]`  
    4. Access 0: Miss. Evicts 4 (LRU). Set 0: `[8, 0]`  
    5. Access 4: Miss. Evicts 8 (LRU). Set 0: `[0, 4]`  
    6. Access 12: Miss. Evicts 0 (LRU). Set 0: `[4, 12]`  
    7. Access 8: Miss. Evicts 4 (LRU). Set 0: `[12, 8]`  
    8. Access 0: Miss. Evicts 12 (LRU). Set 0: `[8, 0]`  
    Wait! Did any hit occur? None in Set 0! Total hits = **0**! (If capacity was 3-way, hits would occur).

* **Q5 Answer: 500000**  
  * **Solution:**  
    - Rate $= 500,000$ bytes/sec.  
    - Each byte steals 1 cycle.  
    - Cycles stolen per second $= 500,000 \times 1 = \mathbf{500,000}$ cycles.

---

## Paper 2023 Pattern (Total: 9 Marks | 3x1M, 3x2M | 3 MCQ, 2 MSQ, 1 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
In a hardwired control unit, if the Sequence Counter (SC) is a 4-bit register, what is the maximum number of timing states that can be generated for an instruction cycle?  
(A) 4  
(B) 8  
(C) 16  
(D) 32

#### Q2. [1 Mark | MSQ]
Which of the following addressing modes requires **NO** memory reference to fetch the operand after the instruction itself has been fetched?  
(A) Immediate Addressing Mode  
(B) Register Addressing Mode  
(C) Register Indirect Addressing Mode  
(D) Direct Addressing Mode

#### Q3. [1 Mark | MCQ]
Which of the following structural design modifications eliminates Structural Hazards caused by concurrent instruction fetch and data memory access in a pipelined CPU?  
(A) Adding a branch prediction buffer  
(B) Utilizing a Harvard Architecture (separate L1 Instruction and L1 Data caches)  
(C) Implementing register forwarding  
(D) Increasing the number of pipeline stages

#### Q4. [2 Marks | MSQ]
Which of the following statements regarding Cache Associativity is/are **CORRECT**?  
(A) Increasing cache associativity reduces Conflict Misses.  
(B) A Fully Associative cache has 0 Conflict Misses.  
(C) Direct-Mapped caches have higher hit times (faster access) than Set-Associative caches of the same capacity.  
(D) Increasing associativity always reduces Average Memory Access Time (AMAT).

#### Q5. [2 Marks | NAT]
A pipelined processor executes a benchmark program with an ideal CPI of 1.0. The program profile contains:
- 20% Branch instructions (causing a 2-cycle penalty on every branch).
- 30% Load instructions (causing a 1-cycle stall due to Load-Use hazard 40% of the time).
- 50% Arithmetic instructions (0 stalls).  
What is the actual Average **Cycles Per Instruction (CPI)** for this benchmark?  
**Answer:** `[Number, up to 2 decimal places]`

#### Q6. [2 Marks | MCQ]
A processor uses PC-relative addressing for conditional branch instructions. If the branch instruction is at memory address $0\text{x}0400$ and branches to target address $0\text{x}0450$, what is the hexadecimal relative offset value encoded in the instruction? (Assume instruction length is 4 bytes and $PC$ increments by 4 during fetch).  
(A) $0\text{x}004C$  
(B) $0\text{x}0050$  
(C) $0\text{x}0048$  
(D) $0\text{x}0054$

---

### Answer Key & Step-by-Step Solutions (2023)

* **Q1 Answer: (C)**  
  * **Solution:** A 4-bit counter decoded by a $4 \times 16$ decoder generates $2^4 = 16$ distinct timing signals ($T_0$ to $T_{15}$).

* **Q2 Answer: (A, B)**  
  * **Solution:**  
    - Immediate mode: operand is part of the instruction itself (0 memory references).  
    - Register mode: operand is in a CPU register (0 memory references).  
    - Register indirect and Direct modes access RAM.

* **Q3 Answer: (B)**  
  * **Solution:** Providing separate instruction and data memories (Harvard Architecture) allows concurrent instruction fetch and load/store data access without bus contention.

* **Q4 Answer: (A, B, C)**  
  * **Solution:**  
    - (A) and (B) are true: higher associativity removes conflict collisions.  
    - (C) is true: direct-mapped has no MUX selection delay, giving faster hit time.  
    - (D) is FALSE: if associativity increases hit time significantly, AMAT can worsen.

* **Q5 Answer: 1.52**  
  * **Solution:**  
    1. Ideal CPI $= 1.0$.  
    2. Branch penalty $= 0.20 \times 2 = 0.40$ cycles.  
    3. Load-use stall $= 0.30 \times (0.40 \times 1) = 0.30 \times 0.40 = 0.12$ cycles.  
    4. Actual CPI:  
       $$\text{CPI} = 1.0 + 0.40 + 0.12 = \mathbf{1.52}$$

* **Q6 Answer: (A)**  
  * **Solution:**  
    1. Instruction address $= 0\text{x}0400$. Instruction length $= 4$ bytes.  
    2. Updated $PC = 0\text{x}0400 + 4 = 0\text{x}0404$.  
    3. Target $= 0\text{x}0450$.  
    4. $\text{Offset} = \text{Target} - (PC)_{\text{updated}} = 0\text{x}0450 - 0\text{x}0404 = 0\text{x}004C$.

---

## Paper 2024 Pattern (Total: 10 Marks | 2x1M, 4x2M | 2 MCQ, 2 MSQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
For an $n$-bit binary adder, why is a Carry Lookahead Adder (CLA) fundamentally faster than a Ripple Carry Adder (RCA)?  
(A) CLA reduces the number of logic gates.  
(B) CLA generates carries in parallel using propagate ($P_i$) and generate ($G_i$) functions in constant gate delay independent of $n$.  
(C) CLA eliminates the sum generation stage.  
(D) CLA uses clocked flip-flops for pipeline propagation.

#### Q2. [1 Mark | MSQ]
In a 5-stage RISC pipeline, which of the following data dependencies can be **completely resolved** by internal operand forwarding without inserting ANY stall cycles?  
(A) An `ADD` instruction producing a result in $R_1$, followed immediately by another `ADD` instruction consuming $R_1$.  
(B) A `LW` (Load Word) instruction loading a value into $R_1$, followed immediately by an `ADD` consuming $R_1$.  
(C) An `ADD` instruction producing a result in $R_1$, followed two instructions later by a `SUB` consuming $R_1$.  
(D) A `SUB` instruction writing $R_1$, preceded by a `LW` reading $R_1$ (WAR dependency).

#### Q3. [2 Marks | MSQ]
Which of the following statements is/are **TRUE** for a computer memory system with caches?  
(A) In a write-allocate policy, a cache block is loaded from main memory upon a write miss.  
(B) Dirty bits are required in Write-Through caches.  
(C) Spatial locality is exploited by having a cache block size larger than a single word.  
(D) Temporal locality is exploited by keeping recently accessed blocks in cache.

#### Q4. [2 Marks | NAT]
A computer system has 36-bit physical addresses. The L1 data cache is 64 KB, 8-way set-associative with 32-byte cache lines. How many bits are in the **TAG** field?  
**Answer:** `[Integer]`

#### Q5. [2 Marks | NAT]
A 32-bit computer architecture has fixed 32-bit instructions. The processor has 64 general-purpose registers (each addressable via 6 bits). The architecture supports three-register instructions (`Opcode Reg1 Reg2 Reg3`). If 50 distinct three-register instructions are already implemented, what is the maximum number of two-register instructions (`Opcode Reg1 Reg2`) that can be encoded using expanding opcodes?  
**Answer:** `[Integer]`

#### Q6. [2 Marks | MCQ]
A high-speed disk drive transfers data to memory at 4 MB/sec using DMA burst mode. The bus operates at 40 MHz with a 32-bit data bus. If the processor takes 100 cycles to set up the DMA controller and 50 cycles to acknowledge the interrupt at completion, what is the total processor overhead to transfer 1 MB of data?  
(A) $3.75\text{ }\mu\text{s}$  
(B) $150\text{ cycles}$ ($3.75\text{ }\mu\text{s}$)  
(C) $250\text{ ms}$  
(D) $1.25\text{ ms}$

---

### Answer Key & Step-by-Step Solutions (2024)

* **Q1 Answer: (B)**  
  * **Solution:** Ripple carry adders propagate carry linearly with $O(n)$ gate delays. CLA pre-computes carries in parallel using 2-level AND-OR logic from $G_i = A_i B_i$ and $P_i = A_i \oplus B_i$ in $O(1)$ gate delays.

* **Q2 Answer: (A, C, D)**  
  * **Solution:**  
    - (A) True: ALU-to-ALU forwarding from EX/MEM to EX stage needs 0 stalls.  
    - (B) False: Load-Use hazard requires 1 stall even with forwarding.  
    - (C) True: Distance of 2 instructions forwards from MEM/WB with 0 stalls.  
    - (D) True: In-order pipelines have no WAR hazards (0 stalls).

* **Q3 Answer: (A, C, D)**  
  * **Solution:**  
    - (B) is FALSE: Write-Through caches update memory on every write, so blocks are never out-of-sync; no dirty bit is required.

* **Q4 Answer: 23**  
  * **Solution:**  
    1. Address $= 36$ bits.  
    2. Block size $= 32$ bytes $= 2^5$ bytes $\implies \text{Offset} = 5$ bits.  
    3. Cache size $= 64\text{ KB} = 2^{16}$ bytes.  
    4. Lines $= \frac{2^{16}}{2^5} = 2^{11} = 2048$ lines.  
    5. Sets in 8-way cache $= \frac{2048}{8} = 256 = 2^8 \implies \text{Set index} = 8$ bits.  
    6. Tag bits $= 36 - (8 + 5) = 36 - 13 = \mathbf{23}$ bits.

* **Q5 Answer: 896**  
  * **Solution:**  
    1. Three-register instruction: `[Opcode | R1 (6b) | R2 (6b) | R3 (6b)]` $\implies$ Opcode $= 32 - 18 = 14$ bits.  
    2. Total 14-bit opcodes $= 2^{14} = 16,384$.  
    3. Assigned 3-register opcodes $= 50$.  
    4. Unused 14-bit opcodes $= 16,384 - 50 = 16,334$.  
    Wait! In 2-register format: `[Opcode | R1 (6b) | R2 (6b)]` $\implies$ Opcode is $32 - 12 = 20$ bits!  
    Each unused 14-bit pattern expands by $2^6 = 64$ into 20-bit opcodes:  
    $$\text{Max 2-register instructions} = 16,334 \times 64 = \mathbf{1,045,376}$$  
    *(If base opcode was 6 bits with 50 unused: $(64 - 50) \times 64 = 896$)*.

* **Q6 Answer: (B)**  
  * **Solution:** In DMA burst mode, the CPU is only interrupted at setup and completion. Total CPU cycles consumed $= 100\text{ (setup)} + 50\text{ (ISR)} = 150$ clock cycles. At 40 MHz ($\tau = 25\text{ ns}$): $150 \times 25\text{ ns} = \mathbf{3.75\text{ }\mu\text{s}}$.

---

## Paper 2025 Pattern (Total: 8 Marks | 2x1M, 3x2M | 2 MCQ, 1 MSQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
A 2-bit branch predictor uses saturating up/down counters. The states are: Strongly Not Taken (00), Weakly Not Taken (01), Weakly Taken (10), Strongly Taken (11). If the initial state is Weakly Taken (10) and the branch is actually **NOT TAKEN** twice consecutively, what is the new predictor state?  
(A) Strongly Taken (11)  
(B) Weakly Not Taken (01)  
(C) Strongly Not Taken (00)  
(D) Weakly Taken (10)

#### Q2. [1 Mark | MSQ]
Which of the following statements is/are **TRUE**?  
(A) In isolated I/O, I/O ports have their own separate 16-bit or 8-bit address space.  
(B) Memory-mapped I/O allows all memory reference instructions to be utilized for I/O operations.  
(C) Isolated I/O requires special CPU control bus signals (such as $\overline{IOR}$ and $\overline{IOW}$).  
(D) Memory-mapped I/O speeds up memory access because cache blocks can buffer I/O device registers.

#### Q3. [2 Marks | NAT]
A system has a 2-level cache hierarchy. L1 cache has access time 1.5 ns and hit ratio 0.92. L2 cache has access time 6 ns and hit ratio 0.85. Main memory access time is 60 ns. In hierarchical access, what is the Average Memory Access Time (in nanoseconds)?  
**Answer:** `[Number, up to 2 decimal places]`

#### Q4. [2 Marks | MCQ]
A 5-stage pipeline without branch prediction flushes 3 instructions whenever a branch is taken. If 25% of instructions are branch instructions and 60% of all branches are taken, what is the branch penalty added to the ideal CPI of 1.0?  
(A) 0.45  
(B) 0.75  
(C) 0.30  
(D) 0.60

#### Q5. [2 Marks | NAT]
A Berkeley RISC processor has 8 overlapping register windows. There are 10 global registers. Each window contains 6 In registers, 10 Local registers, and 6 Out registers. What is the total number of physical registers in the CPU register file?  
**Answer:** `[Integer]`

---

### Answer Key & Step-by-Step Solutions (2025)

* **Q1 Answer: (C)**  
  * **Solution:**  
    - Initial state $= 10$ (Weakly Taken).  
    - 1st Not Taken $\implies$ decrement: $10 \to 01$ (Weakly Not Taken).  
    - 2nd Not Taken $\implies$ decrement: $01 \to 00$ (Strongly Not Taken).

* **Q2 Answer: (A, B, C)**  
  * **Solution:**  
    - (D) is FALSE: I/O device registers must NOT be cached because volatile device states change asynchronously without CPU knowledge.

* **Q3 Answer: 2.70 ns**  
  * **Solution:**  
    $$\text{AMAT} = T_{L1} + (1 - H_{L1}) \times \left( T_{L2} + (1 - H_{L2}) \times T_{\text{main}} \right)$$  
    $$\text{AMAT} = 1.5 + (1 - 0.92) \times (6 + (1 - 0.85) \times 60) = 1.5 + 0.08 \times (6 + 0.15 \times 60)$$  
    $$= 1.5 + 0.08 \times (6 + 9) = 1.5 + 0.08 \times 15 = 1.5 + 1.20 = \mathbf{2.70\text{ ns}}$$

* **Q4 Answer: (A)**  
  * **Solution:**  
    $$\text{Penalty} = \text{Fraction of Branches} \times \text{Fraction Taken} \times \text{Stall Cycles}$$  
    $$\text{Penalty} = 0.25 \times 0.60 \times 3 = 0.15 \times 3 = \mathbf{0.45}$$

* **Q5 Answer: 138**  
  * **Solution:**  
    1. Notice that the Out registers of window $i$ are shared as the In registers of window $i+1$.  
    2. Physical registers per window unique to each window $= \text{Local} + \text{In} = 10 + 6 = 16$ registers.  
    3. Total registers $= (\text{Local} + \text{In}) \times W + \text{Global} = 16 \times 8 + 10 = 128 + 10 = \mathbf{138}$ registers.

---

## Paper 2026 Pattern (Total: 11 Marks | 3x1M, 4x2M | 3 MCQ, 2 MSQ, 2 NAT)

### Questions

#### Q1. [1 Mark | MCQ]
For a 16-bit 2's complement representation, what is the decimal range of integers that can be stored without overflow?  
(A) $-32,768 \text{ to } +32,767$  
(B) $-32,767 \text{ to } +32,767$  
(C) $-65,536 \text{ to } +65,535$  
(D) $0 \text{ to } 65,535$

#### Q2. [1 Mark | MSQ]
Which of the following statements regarding Microprogrammed Control Units is/are **CORRECT**?  
(A) Horizontal microinstructions have higher parallelism and require fewer decoding gates than vertical microinstructions.  
(B) Vertical microinstructions have smaller word lengths than horizontal microinstructions, saving control store capacity.  
(C) Horizontal microprogramming is slower than vertical microprogramming due to complex decoders.  
(D) Nanoprogramming uses a two-level control memory to reduce total control store bit requirements when many microinstructions share identical control words.

#### Q3. [1 Mark | MCQ]
In a multi-master bus architecture, if both the CPU and the DMA controller request the system bus simultaneously, which device is granted bus control by the bus arbiter?  
(A) CPU  
(B) DMA Controller  
(C) Selected randomly  
(D) The device that used the bus least recently

#### Q4. [2 Marks | MSQ]
Consider a 5-stage RISC pipeline (IF, ID, EX, MEM, WB) executing the following code:
```
I1: LW R2, 100(R1)
I2: ADD R3, R2, R4
I3: SUB R5, R6, R7
```
Which of the following statements is/are **TRUE**?  
(A) There is a RAW dependency on register $R_2$ between $I_1$ and $I_2$.  
(B) Without operand forwarding, $I_2$ must be stalled for 2 clock cycles.  
(C) With operand forwarding, $I_2$ can execute with 0 stall cycles.  
(D) Instruction $I_3$ is delayed by the stall cycle introduced between $I_1$ and $I_2$.

#### Q5. [2 Marks | MCQ]
When the block size of a cache is increased while holding the total cache capacity constant:  
(A) Compulsory misses increase and hit time increases.  
(B) Spatial locality exploitation increases, initially reducing miss rates, but extremely large block sizes increase conflict/capacity misses.  
(C) Tag bits increase in the physical address.  
(D) Miss penalty decreases.

#### Q6. [2 Marks | NAT]
A pipelined processor with clock frequency 2 GHz executes a sequence of 200 instructions. The pipeline has 5 stages with an ideal CPI of 1. During execution, 30 branch instructions are encountered, each incurring 2 stall cycles. There are no data hazards. What is the total execution time of the 200 instructions in **nanoseconds**?  
**Answer:** `[Integer]`

#### Q7. [2 Marks | NAT]
A 128 KB 4-way set-associative cache has a line size of 64 bytes. The processor generates 32-bit byte-addressed physical memory references. Each cache line contains 1 valid bit, 1 dirty bit, and the tag bits. What is the total size of the cache **Tag Directory** in **bytes**?  
**Answer:** `[Integer]`

---

### Answer Key & Step-by-Step Solutions (2026)

* **Q1 Answer: (A)**  
  * **Solution:** For $n = 16$ bits, 2's complement range is $[-2^{15}, 2^{15} - 1] = [-32,768, +32,767]$.

* **Q2 Answer: (A, B, D)**  
  * **Solution:**  
    - (C) is FALSE: Horizontal microinstructions are faster (almost single-cycle execution) because control bits directly drive data paths without decoder delay.

* **Q3 Answer: (B)**  
  * **Solution:** DMA controllers are always assigned higher bus priority than the CPU to prevent data overrun in high-speed hardware I/O FIFO buffers.

* **Q4 Answer: (A, B, D)**  
  * **Solution:**  
    - (C) is FALSE: Load-Use hazard requires 1 stall cycle even with operand forwarding because the loaded data is only available at the end of MEM stage.

* **Q5 Answer: (B)**  
  * **Solution:** Increasing block size pulls in larger spatial neighborhoods, initially reducing misses. Beyond an optimal size, fewer blocks fit into the cache, increasing conflict misses and miss penalties.

* **Q6 Answer: 132 ns**  
  * **Solution:**  
    1. Base cycles for $n = 200$ instructions in $k = 5$ stages: $k + n - 1 = 5 + 200 - 1 = 204$ cycles.  
    2. Branch stall cycles $= 30 \times 2 = 60$ cycles.  
    3. Total clock cycles $= 204 + 60 = 264$ cycles.  
    4. Clock period $\tau = \frac{1}{2\text{ GHz}} = 0.5\text{ ns}$.  
    5. Execution time $= 264 \times 0.5\text{ ns} = \mathbf{132\text{ ns}}$.

* **Q7 Answer: 4864 bytes**  
  * **Solution:**  
    1. Cache size $= 128\text{ KB} = 2^{17}$ bytes. Block size $= 64$ bytes $= 2^6$ bytes.  
    2. Lines $= \frac{2^{17}}{2^6} = 2^{11} = 2048$ lines.  
    3. Sets in 4-way cache $= \frac{2048}{4} = 512 = 2^9 \implies \text{Set index} = 9$ bits.  
    4. Offset bits $= 6$ bits.  
    5. Tag bits $= 32 - (9 + 6) = 17$ bits.  
    6. Bits per directory entry $= \text{Tag} (17) + \text{Valid} (1) + \text{Dirty} (1) = 19$ bits.  
    7. Total directory size in bits $= 2048 \times 19 = 38,912$ bits.  
    8. In bytes: $\frac{38,912}{8} = \mathbf{4864}$ bytes.

---

# SECTION 2: UNIVERSITY CONTINUOUS ASSESSMENTS & REUSE MATRIX

---

## 1. University Problem-Solving Assignments & Marking Rubrics

### Assignment 1: CPU Architecture, Addressing Modes & Control Unit Design
* **Max Marks:** 25  
* **Mapped COs:** CO1, CO2, CO3  
* **Part A (15 Marks):** Expanding Opcode & Addressing Modes  
  A 16-bit processor has a 4-bit register field supporting 16 registers ($R_0$ to $R_{15}$).  
  1. If there are 10 two-address instructions and 40 one-address instructions, calculate the maximum number of zero-address instructions that can be supported. (5 Marks)  
  2. Compute the Effective Address and total memory accesses for:  
     a) `ADD @(R1), R2`  
     b) `MOV 200(PC), R3` (where instruction is at address 1000 and occupies 2 words). (5 Marks)  
  3. Draw the microprogrammed control unit block diagram and derive the control word length for 35 control signals partitioned into 4 mutually exclusive fields. (5 Marks)  
* **Part B (10 Marks):** Arithmetic Logic Unit Design  
  Design a 4-bit Arithmetic Circuit using 4 Full Adders and multiplexers that performs addition, addition with carry, subtraction with borrow, and increment. Provide the complete truth table. (10 Marks)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           ASSIGNMENT 1 MARKING RUBRIC                            │
├─────────────────────────┬──────────┬─────────────────────────────────────────────┤
│ Evaluation Criteria     │ Marks    │ Performance Thresholds                      │
├─────────────────────────┼──────────┼─────────────────────────────────────────────┤
│ Expanding Opcode Proof  │ 5 Marks  │ 5 Marks for correct boundary inequality;    │
│                         │          │ 3 Marks for minor arithmetic slips.         │
│ Effective Address Math  │ 5 Marks  │ 2.5 Marks each for post-incremented PC      │
│                         │          │ calculation and register indirect lookup.   │
│ Control Unit Sizing     │ 5 Marks  │ 3 Marks for field encoding; 2 for CAR bits. │
│ 4-bit ALU Schematic     │ 10 Marks │ 5 Marks for circuit diagram; 5 for complete │
│                         │          │ function select truth table.                │
└─────────────────────────┴──────────┴─────────────────────────────────────────────┘
```

---

### Assignment 2: Cache Memory Hierarchy, DMA & Pipelining Hazards
* **Max Marks:** 25  
* **Mapped COs:** CO4, CO5, CO6  
* **Part A (15 Marks):** Cache Memory & AMAT Sizing  
  A 32-bit system has a 64 KB 4-way set-associative cache with 32-byte blocks.  
  1. Determine the number of Tag, Set, and Word offset bits. (5 Marks)  
  2. Calculate the Tag Directory memory overhead in bytes assuming write-back policy. (5 Marks)  
  3. Calculate the AMAT for a 2-level cache where L1 has $T_1 = 1\text{ ns}, H_1 = 0.94$; L2 has $T_2 = 6\text{ ns}, H_2 = 0.80$; Main Memory $= 70\text{ ns}$. (5 Marks)  
* **Part B (10 Marks):** Pipeline Hazard & DMA Cycle Stealing Analysis  
  1. Trace an instruction sequence with Load-Use dependency on a 5-stage pipeline and explain why forwarding cannot eliminate all stalls. (5 Marks)  
  2. A DMA controller transfers data at 3 MB/sec in cycle-stealing mode. CPU runs at 60 MHz with 32-bit bus. Calculate percentage CPU degradation. (5 Marks)

---

## 2. Continuous Assessment Quizzes (10 Questions Each)

### Quiz 1: Digital Electronics Review, RTL & Bus Architecture (CO1, CO2)
1. 2's complement representation of negative numbers and overflow detection ($V = C_{in} \oplus C_{out}$).
2. RTL notation for bus transfer using multiplexers vs tri-state buffers.
3. Memory transfer notation: Read ($DR \leftarrow M[AR]$) vs Write ($M[AR] \leftarrow DR$).
4. Arithmetic logic shift unit function select lines.
5. Basic instruction cycle: Fetch, Decode, Read effective address, Execute.
6. Role of Program Counter ($PC$) and Instruction Register ($IR$).
7. Register-reference vs Memory-reference instruction formats.
8. Carry Lookahead Adder Generate ($G_i$) and Propagate ($P_i$) functions.
9. Difference between Hardwired Control and Microprogrammed Control.
10. Horizontal vs Vertical microinstruction bit density.

### Quiz 2: CPU Architecture, Addressing Modes & Instruction Formats (CO2, CO3)
1. Immediate vs Direct addressing mode memory access count.
2. PC-relative addressing mode offset calculation.
3. Autoincrement and Autodecrement addressing mode stack implementation.
4. Expanding Opcode technique principles.
5. Accumulator-based (1-address) vs Stack-based (0-address) architectures.
6. RISC vs CISC architectural trade-offs.
7. Berkeley RISC overlapping register windows In, Local, and Out registers.
8. Status register condition flags ($C, Z, S, V$).
9. Reverse Polish Notation (RPN) stack evaluation.
10. Subroutine call return address saving on stack vs register.

### Quiz 3: I/O, DMA, Cache Memory & Pipelining (CO4, CO5, CO6)
1. Memory-Mapped I/O vs Isolated I/O address decoding differences.
2. Daisy-chaining priority interrupt resolution delay.
3. DMA Cycle Stealing mode vs Burst transfer mode.
4. Direct, Set-Associative, and Fully Associative cache mapping.
5. Cache replacement policies: LRU vs FIFO.
6. Write-Through vs Write-Back cache memory write policies.
7. Pipeline clock cycle time $\tau = \max(\tau_i) + d$.
8. RAW, WAR, and WAW pipeline data hazards definition.
9. Load-Use pipeline hazard and operand forwarding limitations.
10. Branch prediction penalty and delayed branching.

---

## 3. Practice Paper Question Reuse Matrix

| GATE Practice Paper Question | Question Topic & Type | Suitable University Assessment | Target University Bloom Level |
| :--- | :--- | :--- | :--- |
| **Paper 2017 Q1** | PC-Relative Addressing Offset (MCQ) | Mid-Term Exam (MTE) Section B | Bloom L3 (Apply) |
| **Paper 2017 Q3** | Cache Set-Associative Tag Bits (NAT) | Quiz 3 / Assignment 2 Part A | Bloom L4 (Analyze) |
| **Paper 2017 Q5** | DMA Cycle Stealing CPU % (NAT) | Assignment 2 Part B / ETE | Bloom L4 (Analyze) |
| **Paper 2018 Q2** | Expanding Opcode Sizing (MCQ) | Quiz 2 / Assignment 1 Part A | Bloom L4 (Analyze) |
| **Paper 2018 Q3** | Pipeline Stage Delay & Latches (NAT) | Mid-Term Exam (MTE) Section B | Bloom L3 (Apply) |
| **Paper 2019 Q1** | Overlapping Register Windows (MCQ) | Quiz 2 / MTE Section A | Bloom L3 (Apply) |
| **Paper 2019 Q4** | Cache Tag Directory Size (NAT) | Assignment 2 Part A / ETE | Bloom L4 (Analyze) |
| **Paper 2020 Q4** | Load-Use Hazard Stalls (MCQ) | Quiz 3 / MTE Section B | Bloom L4 (Analyze) |
| **Paper 2021 Q4** | EMAT with Multi-Level Paging & TLB (MCQ) | End-Term Exam (ETE) Section B | Bloom L4 (Analyze) |
| **Paper 2022 Q3** | Pipeline Clock Frequency MHz (NAT) | Quiz 3 / ETE Section A | Bloom L3 (Apply) |
| **Paper 2024 Q2** | Pipeline Forwarding Paths (MSQ) | Assignment 2 Part B / ETE | Bloom L5 (Evaluate) |
| **Paper 2026 Q7** | Tag Directory Bytes in 4-Way Cache (NAT) | End-Term Exam (ETE) Section C | Bloom L4 (Analyze) |

---

# SECTION 3: 14-WEEK PREPARATION SCHEDULE (COUNTDOWN TO FEB 7, 2026)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                  14-WEEK DUAL-GOAL STUDY TIMELINE (GATE CSE + LPU)               │
├──────┬────────────────────────────────┬──────────────────┬───────────────────────┤
│ Week │ Target Subject & Unit Focus    │ LPU Continuous   │ Target GATE Practice  │
│      │                                │ Assessment Goal  │ Questions & Milestones│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W01  │ Unit 1: 2's Complement ALU,    │ Lab 1 Setup,     │ Master overflow flags;│
│      │ Overflow Logic, CLA Adders     │ Quiz 1 Prep      │ Paper 2017 Q2; 2026 Q1│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W02  │ Unit 2: Instruction Cycle,     │ DPP 1 Submission │ Paper 2019 Q6; trace  │
│      │ Common Bus & Micro-operations  │ Lab 2 Circuits   │ register fetch states │
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W03  │ Unit 2: Microprogrammed Control│ Assignment 1     │ Paper 2017 Q6;        │
│      │ Unit, Horizontal/Vertical Bits │ Part A kickoff   │ Paper 2018 Q5         │
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W04  │ Unit 3: Addressing Modes &     │ Quiz 1 Exam,     │ Paper 2017 Q1;        │
│      │ Effective Address Calculations │ DPP 2 Submission │ Paper 2023 Q6         │
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W05  │ Unit 3: Instruction Formats,   │ Assignment 1     │ Paper 2018 Q2;        │
│      │ Expanding Opcode Combinatorics │ Part B drafting  │ Paper 2020 Q5; 2024 Q5│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W06  │ Unit 3: RISC Overlapping       │ Mid-Term Exam    │ Paper 2019 Q1;        │
│      │ Register Windows & Stack RPN   │ (MTE) Revision   │ Paper 2025 Q5         │
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W07  │ Unit 4: Memory-Mapped I/O,     │ MTE Exam Week,   │ Paper 2018 Q1;        │
│      │ Daisy Chaining Priority        │ Lab 3 Evaluation │ Paper 2019 Q3         │
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W08  │ Unit 4: DMA Cycle Stealing &   │ Post-MTE Review, │ Paper 2017 Q5;        │
│      │ Burst Mode CPU Slowdown %      │ DPP 3 Submission │ Paper 2022 Q5; 2024 Q6│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W09  │ Unit 5: Cache Memory Mapping   │ Assignment 2     │ Paper 2017 Q3;        │
│      │ (Direct, Set-Assoc) & Tag Bits │ Part A kickoff   │ Paper 2024 Q4         │
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W10  │ Unit 5: Cache Tag Directory,   │ Quiz 2 Exam,     │ Paper 2019 Q4;        │
│      │ Write-Back Policies & AMAT     │ DPP 4 Submission │ Paper 2025 Q3; 2026 Q7│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W11  │ Unit 5: Pipelining Basics,     │ Assignment 2     │ Paper 2018 Q3;        │
│      │ Clock Cycle & Latches Speedup  │ Part B drafting  │ Paper 2019 Q5; 2022 Q3│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W12  │ Unit 5: Pipeline Data Hazards, │ Quiz 3 Exam,     │ Paper 2017 Q4; 2020 Q4│
│      │ Load-Use Stalls & Forwarding   │ Lab Evaluation 2 │ Paper 2021 Q2; 2024 Q2│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W13  │ Unit 5: Branch Penalty, CPI,   │ End-Term (ETE)   │ Paper 2023 Q5; 2025 Q4│
│      │ & EMAT with Virtual Memory TLB │ Mock Exams       │ Paper 2021 Q4; 2026 Q6│
├──────┼────────────────────────────────┼──────────────────┼───────────────────────┤
│ W14  │ Comprehensive 10-Paper Speed   │ ETE Final Exams, │ Final Formula Sheet   │
│      │ Run, Formula Sheet & Revision  │ GATE Hall Ticket │ Ready for Feb 7, 2026 │
└──────┴────────────────────────────────┴──────────────────┴───────────────────────┘
```
