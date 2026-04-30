import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'projects/memory-architecture-exam-review';
const slidesDir = join(root, 'dsl', 'slides');

const C = {
  bg: '#0B1020',
  panel: '#111827',
  panel2: '#1F2937',
  text: '#F8FAFC',
  muted: '#CBD5E1',
  line: '#334155',
  cyan: '#38BDF8',
  orange: '#F59E0B',
  green: '#22C55E',
  red: '#EF4444',
  purple: '#A78BFA',
  blue: '#2563EB',
  yellow: '#EAB308',
  black: '#000000',
  white: '#FFFFFF',
};

const sourceMap = {
  s1: '4-1-Memory.pdf',
  s2: '4-2-Memory.pdf',
  s3: '4-3-Memory.pdf',
  s4: '4-4-Memory.pdf',
  s5: '4-5-Memory.pdf',
};

const assetDefs = [
  ['asset-memory-wall', 'source-1', 'assets/screenshots/memory-wall.png', 6, 'Memory wall trend: processor demand outpaces DRAM service rate.'],
  ['asset-energy-cost', 'source-1', 'assets/screenshots/energy-cost.png', 10, 'Energy table showing memory accesses as orders of magnitude costlier than arithmetic.'],
  ['asset-vipt-indexing', 'source-4', 'assets/screenshots/vipt-indexing.png', 8, 'Virtually indexed, physically tagged cache organization.'],
  ['asset-way-prediction', 'source-4', 'assets/screenshots/way-prediction.png', 15, 'Way prediction idea for associative caches.'],
  ['asset-page-table-translation', 'source-5', 'assets/screenshots/page-table-translation.png', 14, 'Page-table based virtual-to-physical address translation.'],
];

const slideSpecs = [
  {
    id: 'slide-01-exam-map',
    title: 'Memory Systems: Exam Review Map',
    src: ['s1', 's2', 's3', 's4', 's5'],
    claims: ['A 30-minute dense review should connect cache mechanics, AMAT tradeoffs, cache optimizations, and virtual memory into one hierarchy story.'],
    layout: 'title',
    notes: [
      'Frame the session as an exam-oriented compression of five memory lectures, not as a first-pass lecture.',
      'Tell the audience the recurring pattern: identify the hierarchy level, state the mapping, compute the cost, then name the policy tradeoff.',
      'Emphasize that cache and virtual memory use the same abstraction: a small fast level behaves like a cache for a larger slower level.',
      'Set expectations that modern cases and low-frequency details are reduced to exam-relevant hooks.',
    ],
  },
  {
    id: 'slide-02-memory-wall',
    title: 'The Memory Hierarchy Exists Because Latency, Cost, and Energy Disagree',
    src: ['s1'],
    assets: ['asset-memory-wall', 'asset-energy-cost'],
    claims: ['SRAM is fast but expensive, DRAM is slower but cheaper, disk/flash are much slower; hierarchy exploits locality to approximate a large fast memory.'],
    layout: 'image-pair',
    cards: [
      ['Latency ladder', ['SRAM cache: sub-ns to few ns', 'DRAM: tens of ns', 'Flash: microseconds', 'Disk: milliseconds']],
      ['Exam invariant', ['Fast levels reduce average time', 'Large levels provide capacity', 'Memory references dominate energy and stalls']],
    ],
    notes: [
      'Start with the design impossibility: no single technology gives SRAM latency, disk capacity, and disk cost.',
      'Use the memory-wall figure as evidence that processor demand grows faster than raw DRAM service capability.',
      'Use the energy screenshot to stress that memory accesses can dominate energy, not just runtime.',
      'Transition by saying locality is the empirical fact that lets the hierarchy work.',
    ],
  },
  {
    id: 'slide-03-locality',
    title: 'Locality Is the Contract That Makes Hierarchies Work',
    src: ['s1'],
    claims: ['Temporal locality reuses recently accessed items; spatial locality accesses nearby items; both justify moving blocks/pages rather than individual bytes.'],
    layout: 'three-cards',
    cards: [
      ['Temporal locality', ['If touched now, likely touched again soon.', 'Caches keep recently used blocks.', 'Replacement tries to preserve likely reuse.']],
      ['Spatial locality', ['If address A is touched, nearby addresses may follow.', 'Blocks amortize tag and transfer overhead.', 'Large blocks help until pollution dominates.']],
      ['Hierarchy unit names', ['Register/cache: words and blocks', 'Main memory/disk: pages', 'Same idea, different penalty scale']],
    ],
    notes: [
      'Define locality as a prediction about future references, not as a cache feature.',
      'Connect temporal locality to replacement policies such as LRU or FIFO approximations.',
      'Connect spatial locality to block size and page size choices.',
      'Warn that locality is workload dependent, so every optimization has a failure mode.',
    ],
  },
  {
    id: 'slide-04-cache-questions',
    title: 'Every Cache Design Answers Four Exam Questions',
    src: ['s1', 's2'],
    claims: ['Cache reasoning reduces to placement, identification, replacement, and write behavior.'],
    layout: 'flow',
    cards: [
      ['1. Where can a block go?', ['Direct mapped: one place', 'Set associative: one set, many ways', 'Fully associative: any line']],
      ['2. How is it found?', ['Address = tag | index | offset', 'Index selects candidate set', 'Tag comparison confirms identity']],
      ['3. What is evicted?', ['No choice in direct mapped', 'LRU/FIFO/random in associative caches']],
      ['4. What happens on write?', ['Write-through vs write-back', 'Write-allocate vs no-write-allocate']],
    ],
    notes: [
      'Use this slide as a checklist for solving any cache exam problem.',
      'Tell students to write tag, index, and offset first before simulating hits and misses.',
      'Point out that replacement only matters when more than one candidate line exists.',
      'Transition to direct mapping, where the address-field calculation is most explicit.',
    ],
  },
  {
    id: 'slide-05-address-fields',
    title: 'Address Subdivision: Offset, Index, Tag',
    src: ['s1', 's2'],
    claims: ['Offset bits select a byte/word inside a block; index bits select a cache set; tag bits identify which memory block is currently stored.'],
    layout: 'worked',
    formula: 'Tag\\ bits = Address\\ bits - Index\\ bits - Offset\\ bits',
    cards: [
      ['Recipe', ['Offset = log2(block bytes)', 'Sets = cache size / (block size × associativity)', 'Index = log2(number of sets)', 'Tag = remaining address bits']],
      ['Easy traps', ['Byte-addressable vs word-addressable changes offset.', 'Associativity reduces sets, so index shrinks.', 'Tag storage increases with associativity.']],
    ],
    notes: [
      'Give the mechanical recipe before any example because most exam mistakes happen in address fields.',
      'For byte-addressable memory, offset counts bytes in a cache block; for word-addressable examples, offset may be smaller or zero.',
      'Emphasize that associativity changes the number of sets, not the total data capacity.',
      'The formula element is the one line students should memorize and apply first.',
    ],
  },
  {
    id: 'slide-06-direct-mapped-example',
    title: 'Direct-Mapped Worked Example: Simulate the Mapping Before the Policy',
    src: ['s2'],
    claims: ['In a direct-mapped cache, memory block b maps to cache line b mod number_of_cache_lines; conflicts are forced by equal index bits.'],
    layout: 'example',
    cards: [
      ['Setup', ['5-bit word address space: 32 blocks', '8 cache lines, 1 byte per block', 'Offset = 0, index = 3 bits, tag = 2 bits']],
      ['Access 22', ['Binary 10110', 'Tag = 10, index = 110', 'Line 110 invalid: compulsory miss']],
      ['Access 26', ['Binary 11010', 'Tag = 11, index = 010', 'Line 010 invalid: compulsory miss']],
      ['Conflict cue', ['Addresses with same low 3 bits compete.', 'A later access to 10110 can miss if 110 was overwritten.']],
    ],
    notes: [
      'Walk through one address slowly: convert to binary, split the fields, then look only at the indexed line.',
      'For address 22, the low three bits choose line 110 and the upper two bits become the tag.',
      'For address 26, line 010 is independent, so it does not conflict with 22.',
      'The exam cue is that direct mapped caches have no replacement choice, so conflict behavior follows directly from the index.',
    ],
  },
  {
    id: 'slide-07-miss-types-performance',
    title: 'Miss Types Explain What a Design Change Can Actually Fix',
    src: ['s2', 's3'],
    claims: ['Compulsory, capacity, and conflict misses respond to different design changes; performance combines miss behavior with penalty and CPU time.'],
    layout: 'table-formula',
    formula: 'CPU\\ time = IC \\times (CPI_{base} + Memory\\ stall\\ cycles) \\times Cycle\\ time',
    table: [
      ['Miss type', 'Cause', 'Best lever', 'Caveat'],
      ['Compulsory', 'First touch', 'Larger block / prefetch', 'Can increase penalty'],
      ['Capacity', 'Working set too large', 'Larger cache', 'May increase hit time'],
      ['Conflict', 'Set competition', 'More associativity', 'More comparators / hit time'],
    ],
    notes: [
      'Teach the miss taxonomy as a diagnostic tool rather than vocabulary.',
      'If a block has never been seen, no replacement policy can avoid the compulsory miss.',
      'If a fully associative cache of the same size would still miss, the issue is capacity rather than conflict.',
      'Use the CPU-time equation to remind students that miss rate alone is not performance.',
    ],
  },
  {
    id: 'slide-08-amat-example',
    title: 'AMAT Is the Central Cost Model for Cache Exam Problems',
    src: ['s2', 's3', 's4'],
    claims: ['Average memory access time equals hit time plus miss rate times miss penalty; multilevel versions recursively expand the miss penalty.'],
    layout: 'worked',
    formula: 'AMAT = Hit\\ time + Miss\\ rate \\times Miss\\ penalty',
    cards: [
      ['Single-level example', ['Hit time = 1 cycle', 'Miss rate = 5%', 'Miss penalty = 80 cycles', 'AMAT = 1 + 0.05×80 = 5 cycles']],
      ['Interpretation', ['A small miss rate can dominate when penalty is large.', 'Reducing hit time helps every access.', 'Reducing miss penalty helps only misses.']],
    ],
    notes: [
      'State AMAT as the one formula that ties nearly every cache optimization together.',
      'In the worked example, the miss term contributes four cycles, larger than the hit time itself.',
      'Ask the audience which lever they would choose if hit time increased by one cycle but miss rate dropped by one percent.',
      'Transition to block size and capacity, which reduce miss rate but can worsen other terms.',
    ],
  },
  {
    id: 'slide-09-block-cache-size',
    title: 'Block Size and Cache Size Trade Miss Rate Against Hit Time and Penalty',
    src: ['s2', 's3', 's4'],
    claims: ['Larger blocks reduce compulsory misses until pollution and transfer cost dominate; larger caches reduce capacity misses but can increase access time and power.'],
    layout: 'two-cards',
    cards: [
      ['Larger block size', ['Benefit: fewer compulsory misses via spatial locality.', 'Costs: higher miss penalty; fewer resident blocks.', 'Failure mode: pollution raises capacity/conflict misses.']],
      ['Larger cache capacity', ['Benefit: fewer capacity misses.', 'Costs: longer hit time; more power/area.', 'Exam move: recompute AMAT, not just miss rate.']],
    ],
    notes: [
      'Separate block size from cache size because students often merge the effects.',
      'A larger block does not increase total cache capacity; it reduces the number of distinct blocks stored.',
      'A larger cache can improve miss rate but slow the common hit path.',
      'Emphasize that the winning design is the one with lower AMAT or execution time, not the one with the lowest miss rate alone.',
    ],
  },
  {
    id: 'slide-10-associativity',
    title: 'Associativity Buys Fewer Conflicts at the Price of More Tag Work',
    src: ['s2', 's3'],
    claims: ['Increasing associativity reduces conflict misses but increases tag storage, comparator count, hit time, energy, and design complexity.'],
    layout: 'table-formula',
    formula: 'Sets = \\frac{Cache\\ size}{Block\\ size \\times Ways}',
    table: [
      ['Mapping', 'Placement', 'Lookup cost', 'Typical benefit'],
      ['Direct mapped', '1 line per block', '1 tag compare', 'Fast hit path'],
      ['N-way set associative', '1 set, N ways', 'N tag compares', 'Fewer conflict misses'],
      ['Fully associative', 'Any line', 'Many compares/search', 'Minimum conflict misses'],
    ],
    notes: [
      'Explain that associativity changes where a block is allowed to live.',
      'The formula shows why increasing ways reduces the number of sets and therefore the number of index bits.',
      'Use the table to connect hardware cost to miss-rate benefit.',
      'The likely exam question asks whether the reduced miss rate is worth a longer hit time.',
    ],
  },
  {
    id: 'slide-11-replacement',
    title: 'Replacement Policy Only Matters After Placement Leaves a Choice',
    src: ['s3'],
    claims: ['Direct-mapped caches have no replacement policy; associative caches choose invalid first, then LRU/FIFO/random among valid lines.'],
    layout: 'three-cards',
    cards: [
      ['Direct mapped', ['No victim choice.', 'The indexed line is overwritten.', 'Conflict pattern is deterministic.']],
      ['LRU / FIFO', ['LRU: evict least recently used.', 'Simple for 2-way; harder at high associativity.', 'FIFO approximates age, not true reuse.']],
      ['Random', ['Low implementation cost.', 'Often close to LRU at high associativity.', 'Can avoid pathological bookkeeping.']],
    ],
    notes: [
      'Start by asking whether the cache is direct mapped; if yes, skip replacement-policy reasoning.',
      'For set associative caches, invalid entries are preferred before evicting valid data.',
      'LRU is conceptually attractive but hardware cost grows quickly with associativity.',
      'Random replacement can be surprisingly competitive when associativity is already high.',
    ],
  },
  {
    id: 'slide-12-write-policies',
    title: 'Write Policy Determines Consistency, Bandwidth, and Stall Behavior',
    src: ['s3'],
    claims: ['Write-through updates lower memory immediately; write-back updates cache first and writes dirty blocks on replacement; allocation policy controls write misses.'],
    layout: 'table',
    table: [
      ['Policy', 'Mechanism', 'Pros', 'Cons / exam cue'],
      ['Write-through', 'Update cache and memory', 'Simple; memory consistent', 'Can stall; needs write buffer'],
      ['Write-back', 'Update cache; mark dirty', 'Fewer lower-level writes', 'Dirty eviction penalty; coherence complexity'],
      ['Write-allocate', 'Fetch block on write miss', 'Good with write-back / locality', 'Extra read traffic'],
      ['No-write-allocate', 'Write lower level only', 'Avoids cache pollution', 'Often paired with write-through'],
    ],
    notes: [
      'Make the consistency distinction first: write-through keeps memory current, while write-back may leave memory stale until eviction.',
      'Introduce the dirty bit as the metadata that makes write-back possible.',
      'Write buffers reduce stalls but can create read-after-write conflicts with pending lower-memory writes.',
      'Allocation policy is a separate axis and is especially important on write misses.',
    ],
  },
  {
    id: 'slide-13-write-checkpoint',
    title: 'Checkpoint: On a Write Miss, Ask Two Independent Questions',
    src: ['s3'],
    claims: ['A write miss is resolved by both an update policy and an allocation policy; the common pairing is write-back with write-allocate.'],
    layout: 'flow',
    cards: [
      ['Question A: update where?', ['Write-through: cache + memory', 'Write-back: cache only, dirty bit']],
      ['Question B: bring block in?', ['Write-allocate: fetch then write', 'No-write-allocate: write around cache']],
      ['Common pairings', ['Write-through + no-write-allocate is common.', 'Write-back + write-allocate is common.', 'Always state assumptions before simulation.']],
      ['RAW hazard cue', ['A read miss may need data sitting in the write buffer.', 'Check buffer before waiting for memory.']],
    ],
    notes: [
      'Use this as the first small checkpoint rather than a long trace.',
      'Tell students that update policy and allocation policy are orthogonal choices.',
      'For simulations, they should write both assumptions at the top of the problem.',
      'Mention the write-buffer RAW hazard because it appears in optimization questions about prioritizing reads.',
    ],
  },
  {
    id: 'slide-14-basic-optimizations',
    title: 'Six Basic Cache Optimizations Map Directly to AMAT Terms',
    src: ['s4'],
    claims: ['The six basic optimizations target hit time, miss rate, or miss penalty; each has a counter-cost.'],
    layout: 'matrix',
    table: [
      ['Optimization', 'Targets', 'Counter-cost'],
      ['Larger block size', 'Compulsory miss rate ↓', 'Penalty ↑; pollution ↑'],
      ['Larger cache', 'Capacity miss rate ↓', 'Hit time / power ↑'],
      ['Higher associativity', 'Conflict miss rate ↓', 'Hit time / power ↑'],
      ['Multilevel cache', 'Miss penalty ↓', 'More hierarchy interactions'],
      ['Read misses before writes', 'Miss penalty ↓', 'Buffer checks / ordering'],
      ['Avoid translation in indexing', 'Hit time ↓', 'Aliasing / size constraints'],
    ],
    notes: [
      'Anchor the six optimizations to AMAT rather than presenting them as a list.',
      'For each row, name the AMAT term being improved and the term or hardware cost that may get worse.',
      'This table is a high-yield review slide because it predicts many short-answer questions.',
      'Transition to multilevel caches because they recursively define miss penalty.',
    ],
  },
  {
    id: 'slide-15-multilevel-cache',
    title: 'Multilevel Caches Keep L1 Fast and Make L1 Misses Cheaper',
    src: ['s3', 's4'],
    claims: ['L1 is optimized for hit time; lower levels are larger and more associative to reduce the effective miss penalty seen by L1.'],
    layout: 'worked',
    formula: 'AMAT = T_{L1} + MR_{L1}(T_{L2} + MR_{L2} \\times Penalty_{mem})',
    cards: [
      ['Design split', ['L1: small, fast, often lower associativity', 'L2/L3: larger, slower, higher associativity', 'Goal: reduce overall memory access time']],
      ['Exam cue', ['Use local L2 miss rate unless stated global.', 'Substitute recursively before comparing designs.', 'A tiny lower-level miss-rate change can matter when memory penalty is huge.']],
    ],
    notes: [
      'Explain that multilevel cache design separates the fast common hit path from the expensive miss path.',
      'The formula makes L2 part of the L1 miss penalty rather than a separate independent average.',
      'Clarify local versus global miss rates because that distinction changes the arithmetic.',
      'Move next to translation, because indexing must fit into the hit-time path.',
    ],
  },
  {
    id: 'slide-16-vipt',
    title: 'Avoiding Translation on the Hit Path: Virtually Indexed, Physically Tagged',
    src: ['s4', 's5'],
    assets: ['asset-vipt-indexing'],
    claims: ['VIPT caches use page-offset bits for indexing while the TLB translates the virtual page number; the physical tag prevents synonym mistakes.'],
    layout: 'image-right',
    cards: [
      ['Why this exists', ['Conventional path waits for VA→PA before cache lookup.', 'Hit time improves if indexing overlaps TLB access.', 'Lower page-offset bits are identical in VA and PA.']],
      ['Constraint', ['Index + offset must fit in page-offset bits.', 'Bigger L1 often requires higher associativity.', 'Aliasing/synonyms require physical tags or OS support.']],
    ],
    notes: [
      'Use the screenshot to show the timeline: VA goes to both TLB and cache indexing.',
      'The central trick is that page-offset bits do not change during address translation.',
      'The cache can start set access early, then compare the physical tag when translation returns.',
      'The exam constraint is that cache indexing cannot use virtual bits that may differ from physical bits.',
    ],
  },
  {
    id: 'slide-17-advanced-cache',
    title: 'Advanced Cache Optimizations: Bandwidth and Parallelism, Not Magic',
    src: ['s4'],
    claims: ['Advanced cache optimizations reduce hit time, miss penalty, or bandwidth stalls by exploiting prediction, pipelining, banking, nonblocking behavior, and prefetching.'],
    layout: 'three-cards',
    cards: [
      ['Hit-time levers', ['Small/simple L1', 'Way prediction', 'Pipelined cache access']],
      ['Bandwidth levers', ['Multibanked caches', 'Merging write buffers', 'Critical word first / early restart']],
      ['Miss-overlap levers', ['Nonblocking caches', 'Hardware prefetching', 'Compiler blocking and prefetching']],
    ],
    notes: [
      'Position advanced optimizations as ways to exploit concurrency or prediction when basic AMAT tuning is not enough.',
      'Small simple L1 reduces the critical path, while way prediction tries to avoid reading every way.',
      'Banking and buffering increase effective bandwidth without necessarily reducing raw latency.',
      'Nonblocking and prefetching try to hide miss latency rather than remove it.',
    ],
  },
  {
    id: 'slide-18-way-prediction',
    title: 'Way Prediction Trades Occasional Replay for Lower Energy and Faster Hits',
    src: ['s4'],
    assets: ['asset-way-prediction'],
    claims: ['Way prediction guesses which way will hit, reads that way first, and checks other ways only after a misprediction.'],
    layout: 'image-right',
    cards: [
      ['Mechanism', ['Predict way from low-order tag/history bits.', 'Read one data way and one tag path first.', 'On mismatch, search remaining ways.']],
      ['Tradeoff', ['Correct prediction: lower energy and shorter hit path.', 'Wrong prediction: extra cycle or replay.', 'I-cache usually predicts better than D-cache.']],
    ],
    notes: [
      'Use the diagram to contrast conventional parallel tag checks with predicted one-way access.',
      'The optimization is valuable because associative caches otherwise read multiple ways even though only one can be returned.',
      'A misprediction does not change correctness; it changes latency.',
      'Connect this to the broader theme that prediction improves common cases but introduces recovery cost.',
    ],
  },
  {
    id: 'slide-19-miss-penalty-bandwidth',
    title: 'Miss-Penalty Optimizations Decide What Can Proceed While Waiting',
    src: ['s4'],
    claims: ['Pipelining, banking, nonblocking caches, critical-word-first, write-buffer merging, and prefetching all try to overlap or shorten visible miss cost.'],
    layout: 'table',
    table: [
      ['Optimization', 'Idea', 'Best when', 'Risk'],
      ['Pipelined cache', 'Split hit into stages', 'High clock pressure', 'More hit latency stages'],
      ['Multibanked cache', 'Parallel banks', 'Many independent accesses', 'Bank conflicts'],
      ['Nonblocking cache', 'Hit-under-miss / miss-under-miss', 'Memory-level parallelism', 'MSHR complexity'],
      ['Critical word first', 'Return needed word early', 'Processor can restart soon', 'Less useful for full-block use'],
      ['Prefetching', 'Fetch before demand', 'Predictable streams', 'Pollution and bandwidth waste'],
    ],
    notes: [
      'Summarize these optimizations by asking what work can continue during a miss.',
      'Pipelining and banking mainly improve throughput and frequency, not necessarily single-access latency.',
      'Nonblocking caches require machinery to track outstanding misses, often called MSHRs in architecture discussions.',
      'Prefetching is only useful when prediction accuracy and timeliness outweigh pollution and bandwidth cost.',
    ],
  },
  {
    id: 'slide-20-vm-rationale',
    title: 'Virtual Memory Is a Cache Analogy Plus Protection and Abstraction',
    src: ['s5'],
    claims: ['Virtual memory treats DRAM as a cache for disk/storage while also giving each process private address spaces, controlled sharing, and protection.'],
    layout: 'three-cards',
    cards: [
      ['Capacity illusion', ['Programs use virtual addresses.', 'Pages can live in DRAM or on disk.', 'Physical memory acts like a cache for storage.']],
      ['Protection/isolation', ['Each process has its own page table.', 'Valid/protection bits constrain access.', 'Kernel controls mappings.']],
      ['Modern uses', ['Overcommitment and copy-on-write', 'Huge pages reduce TLB pressure', 'GPU/unified memory reuse VM ideas']],
    ],
    notes: [
      'State explicitly that VM is not only about running programs bigger than memory.',
      'It also provides the abstraction that each process has a private, contiguous address space.',
      'Modern cloud and AI examples are kept as short hooks because the exam core is translation and page faults.',
      'Transition to the mechanics of translating a virtual address into a physical address.',
    ],
  },
  {
    id: 'slide-21-translation',
    title: 'Address Translation Replaces VPN With PPN and Preserves the Offset',
    src: ['s5'],
    assets: ['asset-page-table-translation'],
    claims: ['A virtual address splits into VPN and page offset; the page table maps VPN to PPN, and the offset passes through unchanged.'],
    layout: 'image-right',
    formula: 'VA = VPN \\| offset \\quad\\Rightarrow\\quad PA = PPN \\| offset',
    cards: [
      ['Mechanism', ['Page table base register locates current process table.', 'VPN indexes page-table entry.', 'Valid bit decides memory resident vs fault.']],
      ['Exam recipe', ['Compute offset bits from page size.', 'VPN = high VA bits.', 'Replace VPN with PPN; keep offset identical.']],
    ],
    notes: [
      'Use the screenshot to show that the page offset is copied, not translated.',
      'The page-table entry contains the physical page number plus metadata such as valid and protection bits.',
      'If valid is zero, hardware or OS raises a page fault instead of producing a normal physical address.',
      'For calculation problems, first compute page-offset bits from the page size.',
    ],
  },
  {
    id: 'slide-22-page-faults',
    title: 'Page Faults Are Misses Handled by the Operating System',
    src: ['s5'],
    claims: ['A page fault occurs when the referenced page is not resident; the OS chooses placement/replacement, performs I/O, updates the page table, and restarts the instruction.'],
    layout: 'flow',
    cards: [
      ['1. Detect', ['PTE valid bit is 0.', 'Processor traps to OS exception handler.']],
      ['2. Resolve', ['Find page on disk/storage.', 'Choose free frame or victim page.', 'Write back dirty victim if needed.']],
      ['3. Update', ['Load requested page into DRAM.', 'Update PTE/TLB state.', 'Restart faulting instruction.']],
      ['Why OS?', ['Disk latency is huge.', 'OS can use smarter replacement.', 'Hardware handles common TLB/cache hits.']],
    ],
    notes: [
      'Connect page faults to cache misses but stress the different scale and handler.',
      'Because disk or storage latency is enormous, the operating system can afford complex replacement decisions.',
      'Dirty pages must be written back before their frame is reused.',
      'The current process may suspend while another process runs, which is very different from a normal cache miss stall.',
    ],
  },
  {
    id: 'slide-23-tlb-page-tables',
    title: 'TLBs and Multi-Level Page Tables Make Translation Practical',
    src: ['s5'],
    claims: ['The TLB caches page-table translations; multi-level page tables reduce memory overhead by allocating page-table pieces only where virtual space is used.'],
    layout: 'two-cards',
    cards: [
      ['TLB = translation cache', ['Caches recent VPN→PPN translations.', 'TLB hit avoids page-table memory access.', 'TLB miss can be hardware or OS handled.']],
      ['Multi-level page table', ['Break VPN into several indexes.', 'Allocate lower-level tables lazily.', 'Saves space for sparse virtual address spaces.']],
    ],
    notes: [
      'Introduce the TLB as a cache for page-table entries, not for data bytes.',
      'A TLB hit allows address translation to complete quickly enough to stay near the cache hit path.',
      'A TLB miss is not necessarily a page fault; the page may be resident but not cached in the TLB.',
      'Multi-level page tables solve the memory overhead problem of huge sparse virtual address spaces.',
    ],
  },
  {
    id: 'slide-24-final-checklist',
    title: 'Final Exam Checklist: Solve by Naming the Level, Mapping, and Cost',
    src: ['s1', 's2', 's3', 's4', 's5'],
    claims: ['Most memory-system questions can be solved by identifying the hierarchy level, mapping fields, policy assumptions, and the AMAT or translation cost equation.'],
    layout: 'checklist',
    cards: [
      ['Cache calculation', ['Write address fields before simulating.', 'Track valid/tag/dirty/LRU state.', 'Classify misses only after the trace.']],
      ['Performance comparison', ['Use AMAT or CPU time.', 'Check local vs global miss rates.', 'Include hit-time changes.']],
      ['Policy tradeoff', ['State write and replacement assumptions.', 'Name which miss type changes.', 'Report the counter-cost.']],
      ['Virtual memory', ['Offset bits from page size.', 'VPN→PPN via page table/TLB.', 'Distinguish TLB miss from page fault.']],
    ],
    notes: [
      'Close by giving the audience a repeatable solving protocol instead of another content list.',
      'For cache traces, fields and state tables prevent most arithmetic and policy mistakes.',
      'For design comparisons, always compute the performance metric rather than trusting intuition.',
      'For virtual memory, separate translation caching, resident-page status, and protection checks.',
    ],
  },
];

function ensureDirs() {
  for (const dir of [
    root,
    join(root, 'extraction', 'normalized'),
    join(root, 'planning'),
    join(root, 'dsl'),
    slidesDir,
    join(root, 'review'),
  ]) mkdirSync(dir, { recursive: true });
}

function jwrite(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path, value) {
  writeFileSync(path, value);
}

function t(id, x, y, width, content, fontSize = 18, color = C.text, extra = {}) {
  return { id, type: 'text', x, y, width, content, fontSize, fontFamily: 'Arial', color, lineHeight: extra.lineHeight ?? 1.22, ...extra };
}

function r(id, x, y, width, height, fill = C.panel, extra = {}) {
  return { id, type: 'rect', x, y, width, height, fill, radius: extra.radius ?? 8, ...extra };
}

function line(id, x, y, x2, y2, stroke = C.line, strokeWidth = 2) {
  return { id, type: 'line', x, y, x2, y2, stroke, strokeWidth };
}

function formula(id, x, y, width, latex, fontSize = 25) {
  return { id, type: 'formula', x, y, width, height: 54, latex, displayMode: true, fontSize, color: C.text };
}

function image(id, x, y, width, height, src) {
  return { id, type: 'image', x, y, width, height, src, fit: 'contain' };
}

function tableEl(id, x, y, width, height, rows, fontSize = 15) {
  return {
    id,
    type: 'table',
    x,
    y,
    width,
    height,
    rows,
    style: {
      headerBackground: C.blue,
      headerColor: C.white,
      rowStripe: true,
      stripeColor: C.panel2,
      borderColor: C.line,
      borderWidth: 1,
      cellPadding: '8px 10px',
      fontSize,
      fontFamily: 'Arial',
      rounded: true,
    },
  };
}

function bullets(items) {
  return items.map((item) => `• ${item}`).join('\n');
}

function frame(spec, n) {
  return [
    r(`${spec.id}-top-band`, 0, 0, 1280, 86, C.panel),
    t(`${spec.id}-num`, 38, 26, 60, String(n).padStart(2, '0'), 18, C.cyan, { fontWeight: 'bold' }),
    t(`${spec.id}-title`, 96, 20, 980, spec.title, 30, C.text, { fontWeight: 'bold', lineHeight: 1.08 }),
    t(`${spec.id}-src`, 1068, 30, 164, (spec.src ?? []).map((s) => sourceMap[s]).join('\n'), 10, C.muted, { align: 'right', lineHeight: 1.15 }),
    line(`${spec.id}-rule`, 38, 92, 1242, 92, C.line, 1),
  ];
}

function cardElements(prefix, x, y, w, h, heading, items, accent = C.cyan, bodySize = 16) {
  return [
    r(`${prefix}-box`, x, y, w, h, C.panel, { stroke: C.line, strokeWidth: 1 }),
    r(`${prefix}-accent`, x, y, 6, h, accent, { radius: 4 }),
    t(`${prefix}-head`, x + 20, y + 16, w - 34, heading, 18, accent, { fontWeight: 'bold' }),
    t(`${prefix}-body`, x + 20, y + 52, w - 34, bullets(items), bodySize, C.muted, { lineHeight: 1.28 }),
  ];
}

function drawAddressDiagram(spec) {
  const x = 572, y = 290;
  const parts = [
    ['TAG', 190, C.purple],
    ['INDEX', 220, C.cyan],
    ['OFFSET', 170, C.orange],
  ];
  const els = [t(`${spec.id}-addr-label`, x, y - 48, 620, 'Address bits are fields with different jobs', 22, C.text, { fontWeight: 'bold' })];
  let cx = x;
  for (const [label, w, color] of parts) {
    els.push(r(`${spec.id}-addr-${label.toLowerCase()}`, cx, y, w, 78, C.panel2, { stroke: color, strokeWidth: 2 }));
    els.push(t(`${spec.id}-addr-${label.toLowerCase()}-txt`, cx, y + 24, w, label, 20, color, { fontWeight: 'bold', align: 'center' }));
    cx += w;
  }
  els.push(t(`${spec.id}-addr-caption`, x, y + 104, 580, 'Tag identifies the resident block; index selects the set/line; offset selects bytes or words inside the block.', 16, C.muted));
  return els;
}

function titleSlide(spec, n) {
  return {
    id: spec.id,
    background: C.bg,
    elements: [
      r(`${spec.id}-left`, 58, 76, 720, 520, C.panel, { stroke: C.line, strokeWidth: 1 }),
      t(`${spec.id}-kicker`, 96, 122, 540, 'PRINCIPLES OF COMPUTER ARCHITECTURE', 15, C.cyan, { fontWeight: 'bold' }),
      t(`${spec.id}-main`, 92, 176, 620, 'Memory Systems\nExam Review', 62, C.text, { fontWeight: 'bold', lineHeight: 0.98 }),
      t(`${spec.id}-sub`, 98, 350, 570, '30-minute dense review for CS graduate students: cache mechanics, AMAT, optimizations, and virtual memory.', 22, C.muted, { lineHeight: 1.32 }),
      ...cardElements(`${spec.id}-card-a`, 832, 116, 348, 126, 'Exam route', ['Fields → state → policy → cost', 'Use equations before intuition'], C.orange),
      ...cardElements(`${spec.id}-card-b`, 832, 272, 348, 126, 'Coverage', ['All five Memory PDFs compressed', 'Few high-value worked checkpoints'], C.green),
      ...cardElements(`${spec.id}-card-c`, 832, 428, 348, 126, 'Output', ['HTML preview + PPTX', 'Speaker notes included'], C.purple),
      t(`${spec.id}-n`, 48, 646, 1180, `Slide ${n} / ${slideSpecs.length}`, 13, C.muted, { align: 'right' }),
    ],
    notes: numbered(spec.notes),
  };
}

function numbered(lines) {
  return lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
}

function contentSlide(spec, n) {
  const els = frame(spec, n);
  if (spec.layout === 'image-pair') {
    els.push(...cardElements(`${spec.id}-left-a`, 58, 120, 410, 160, spec.cards[0][0], spec.cards[0][1], C.cyan));
    els.push(...cardElements(`${spec.id}-left-b`, 58, 306, 410, 160, spec.cards[1][0], spec.cards[1][1], C.orange));
    els.push(r(`${spec.id}-img-a-frame`, 508, 122, 330, 246, C.white, { radius: 6 }));
    els.push(image(`${spec.id}-img-a`, 518, 132, 310, 226, 'assets/screenshots/memory-wall.png'));
    els.push(r(`${spec.id}-img-b-frame`, 872, 122, 330, 246, C.white, { radius: 6 }));
    els.push(image(`${spec.id}-img-b`, 882, 132, 310, 226, 'assets/screenshots/energy-cost.png'));
    els.push(t(`${spec.id}-takeaway`, 510, 410, 690, 'Takeaway: hierarchy design is an optimization problem over latency, capacity, cost, and energy. Locality is the enabling assumption.', 22, C.text, { fontWeight: 'bold', lineHeight: 1.25 }));
  } else if (spec.layout === 'three-cards') {
    spec.cards.forEach((card, i) => els.push(...cardElements(`${spec.id}-card-${i}`, 58 + i * 405, 136, 360, 386, card[0], card[1], [C.cyan, C.orange, C.green][i], 17)));
  } else if (spec.layout === 'flow' || spec.layout === 'checklist') {
    spec.cards.forEach((card, i) => {
      const x = 58 + (i % 2) * 610;
      const y = 124 + Math.floor(i / 2) * 228;
      els.push(...cardElements(`${spec.id}-flow-${i}`, x, y, 552, 178, card[0], card[1], [C.cyan, C.orange, C.green, C.purple][i], 16));
    });
  } else if (spec.layout === 'worked') {
    els.push(r(`${spec.id}-formula-panel`, 58, 126, 1164, 92, C.panel2, { stroke: C.line, strokeWidth: 1 }));
    els.push(formula(`${spec.id}-formula`, 88, 146, 1100, spec.formula, 25));
    spec.cards.forEach((card, i) => els.push(...cardElements(`${spec.id}-work-${i}`, 58 + i * 586, 254, 540, 260, card[0], card[1], [C.cyan, C.orange][i], 17)));
    if (spec.id === 'slide-05-address-fields') els.push(...drawAddressDiagram(spec));
  } else if (spec.layout === 'example') {
    spec.cards.forEach((card, i) => {
      const x = 58 + (i % 2) * 610;
      const y = 126 + Math.floor(i / 2) * 216;
      els.push(...cardElements(`${spec.id}-ex-${i}`, x, y, 552, 166, card[0], card[1], [C.cyan, C.orange, C.green, C.purple][i], 16));
    });
  } else if (spec.layout === 'table-formula') {
    els.push(r(`${spec.id}-formula-bg`, 58, 120, 1164, 74, C.panel2, { stroke: C.line, strokeWidth: 1 }));
    els.push(formula(`${spec.id}-formula`, 82, 132, 1100, spec.formula, 22));
    els.push(tableEl(`${spec.id}-table`, 58, 220, 1164, 360, spec.table, 14));
  } else if (spec.layout === 'two-cards') {
    spec.cards.forEach((card, i) => els.push(...cardElements(`${spec.id}-two-${i}`, 72 + i * 602, 136, 532, 376, card[0], card[1], [C.cyan, C.orange][i], 18)));
  } else if (spec.layout === 'table' || spec.layout === 'matrix') {
    els.push(tableEl(`${spec.id}-table`, 58, 126, 1164, spec.table.length > 5 ? 438 : 392, spec.table, spec.table.length > 5 ? 13 : 14));
    els.push(t(`${spec.id}-bottom`, 78, 604, 1110, 'Exam habit: identify the improved AMAT term, then name the hardware or policy cost that gets worse.', 18, C.muted));
  } else if (spec.layout === 'image-right') {
    const img = spec.assets?.[0] === 'asset-vipt-indexing'
      ? 'assets/screenshots/vipt-indexing.png'
      : spec.assets?.[0] === 'asset-way-prediction'
        ? 'assets/screenshots/way-prediction.png'
        : 'assets/screenshots/page-table-translation.png';
    const leftW = 510;
    spec.cards.forEach((card, i) => els.push(...cardElements(`${spec.id}-left-${i}`, 58, 126 + i * 206, leftW, 164, card[0], card[1], [C.cyan, C.orange][i], 15)));
    if (spec.formula) {
      els.push(r(`${spec.id}-formula-bg`, 58, 544, leftW, 64, C.panel2, { stroke: C.line, strokeWidth: 1 }));
      els.push(formula(`${spec.id}-formula`, 72, 552, leftW - 28, spec.formula, 18));
    }
    els.push(r(`${spec.id}-img-frame`, 620, 126, 582, 438, C.white, { radius: 6 }));
    els.push(image(`${spec.id}-img`, 632, 138, 558, 414, img));
    els.push(t(`${spec.id}-caption`, 630, 580, 560, 'Source screenshot retained because the diagram carries exam-relevant structure.', 13, C.muted, { align: 'center' }));
  }
  return { id: spec.id, background: C.bg, elements: els, notes: numbered(spec.notes) };
}

function slideToBlock(spec, i) {
  return {
    id: `block-${spec.id}`,
    materialId: spec.src?.[0] ? spec.src[0].replace('s', 'source-') : 'source-1',
    kind: 'text',
    text: `${spec.title}\n${spec.claims.join('\n')}`,
    pageIndex: i,
    sourceOrder: i,
    assetRefs: spec.assets ?? [],
  };
}

function writeRequirements() {
  const md = `# Requirements: Memory Systems Exam Review

Topic: Computer architecture memory systems.

Audience: CS graduate students who have already studied cache and virtual memory.

Goal: Prepare for an exam with a dense 30-minute review deck.

Language: English.

Duration and density: 22-26 information-dense slides, final plan uses 24 slides.

Outputs: HTML preview and PPTX.

Style: dense academic review in a dark format, using compact tables, formulas, architecture diagrams, and a small number of high-value worked examples.

Must cover: all five source PDFs in projects/: 4-1 through 4-5 Memory.

Exercise strategy: keep only a small number of high-value worked examples/checkpoints, reserving most space for knowledge points.

Forbidden or reduced content: course homepage/instructor info, overlong modern examples, original slide-by-slide examples, and low-frequency hardware details.

Asset policy: retain important screenshots when they materially help exam review.
`;
  writeText(join(root, 'requirements.md'), md);
  jwrite(join(root, 'requirements.json'), {
    topic: 'Computer architecture memory systems',
    goal: 'Prepare CS graduate students for an exam with a dense 30-minute review deck.',
    audience: 'CS graduate students who already studied cache and virtual memory',
    theme: 'dark academic review',
    themeDirection: 'Dense dark academic review with compact tables, formulas, and key source screenshots.',
    language: 'en',
    slideCount: 24,
    durationMinutes: 30,
    outputFormats: ['html', 'pptx'],
    speakerNotes: true,
    mandatoryContent: ['All five Memory PDFs', 'Cache mechanics', 'AMAT', 'Cache optimizations', 'Virtual memory'],
    forbiddenContent: ['Course homepage/instructor info', 'Overlong modern examples', 'Original slide-by-slide examples', 'Low-frequency hardware details'],
    styleId: 'memory-dark-review',
  });
}

function writeInterviewPrd() {
  const prd = `# Deep Interview PRD

## Intent
Create a 30-minute English exam-review slide deck from five computer architecture Memory PDFs.

## Desired outcome
An information-dense, dark-format academic review deck for CS graduate students who already know cache and virtual memory and need exam preparation.

## In scope
- Cover all five Memory PDFs in \`projects/\`.
- Compress concepts into roughly 22-26 slides; final plan uses 24.
- Prioritize exam-high-yield concepts, formulas, comparison tables, address-field recipes, AMAT, write policy tradeoffs, cache optimizations, and virtual memory translation/page-fault mechanics.
- Include concise speaker notes.
- Export HTML preview and PPTX.

## Non-goals
- Do not include course homepage or instructor information.
- Do not reproduce the original lecture slides page by page.
- Do not spend space on overlong modern examples or low-frequency hardware details.
- Do not add many drill problems; keep only high-value worked examples/checkpoints.

## Decision boundaries
When content conflicts with the 30-minute duration, keep exam-frequency concepts and formulas in slides, move minor caveats to notes, and omit long cases.

## Acceptance criteria
- Deck DSL is generated from slide slices and assembled through the workflow.
- Slide count is within 22-26.
- Final deck uses all-English slide text and notes.
- HTML preview and PPTX build successfully.
- Important source screenshots are retained where they explain key structures.
`;
  writeText('docs/deep-interview-prd.md', prd);
}

function writeExtraction() {
  const materials = [1, 2, 3, 4, 5].map((n) => ({
    id: `source-${n}`,
    sourceId: `source-${n}`,
    markdownPath: `extraction/normalized/source-${n}-full.txt`,
    title: `4-${n}-Memory`,
    pageCount: [27, 29, 29, 32, 48][n - 1],
  }));
  const blocks = slideSpecs.map(slideToBlock);
  const assets = assetDefs.map(([id, materialId, sourcePath, pageIndex, caption], i) => ({
    id,
    materialId,
    kind: 'image',
    sourcePath,
    normalizedPath: sourcePath,
    pageIndex,
    caption,
    sourceOrder: i,
  }));
  jwrite(join(root, 'extraction', 'normalized', 'materials.json'), materials);
  jwrite(join(root, 'extraction', 'normalized', 'blocks.json'), blocks);
  jwrite(join(root, 'extraction', 'normalized', 'assets.json'), assets);
  writeText(join(root, 'extraction', 'normalized', 'source-summary.md'), `# Source Summary

Five Memory PDFs were extracted locally with \`pdftotext\`; selected pages were rendered with \`pdftoppm\` as deck-local screenshots.

## 4-1 Memory
Memory hierarchy motivation, technology tradeoffs, memory wall, energy cost, locality, basic cache organization, direct mapping, tags, valid bits, and address subdivision.

## 4-2 Memory
Direct-mapped cache examples, address field calculations, cache misses, cache performance, AMAT, block-size tradeoffs, associative caches, and associativity examples.

## 4-3 Memory
Associativity/tag overhead, miss classes, replacement policies, write-through/write-back/write buffers, write allocation, cache performance examples, and basic cache optimizations.

## 4-4 Memory
Six basic cache optimizations, multilevel cache, read misses over writes, virtual indexing and physical tagging, and advanced cache optimizations including small L1, way prediction, pipelining, banking, nonblocking caches, critical word first, write-buffer merging, and prefetching.

## 4-5 Memory
Virtual memory motivation, modern systems examples, address translation, page tables, page faults, TLBs, multi-level page tables, page size, protection, memory technology backup material, and virtual machines.
`);
}

function writeOutline() {
  const lines = [
    '# Outline Draft: Memory Systems Exam Review',
    '',
    'Thesis: memory systems are best reviewed as a sequence of mapping, policy, and cost decisions across cache and virtual memory.',
    '',
    'Audience: CS graduate students preparing for an exam after prior exposure to cache and virtual memory.',
    '',
    'Duration: approximately 30 minutes.',
    '',
    'Style: dense dark academic review; compact tables, equations, architecture diagrams, and a few high-value worked examples.',
    '',
    'Outputs: HTML preview and PPTX.',
    '',
    'Omissions: course/instructor front matter, long modern case studies, original slide-by-slide traces, and low-frequency hardware details.',
    '',
    '## Slide Outline',
    '',
    ...slideSpecs.map((s, i) => `${i + 1}. ${s.title}`),
    '',
    '## Approval Basis',
    '',
    'The user approved the 22-26 slide dense-review tradeoff and asked to proceed with this scope.',
  ];
  writeText(join(root, 'planning', 'outline-draft.md'), `${lines.join('\n')}\n`);
}

function writeDeckPlan() {
  const deckDesign = {
    styleId: 'memory-dark-review',
    theme: 'minimal-white',
    canvas: { width: 1280, height: 720 },
    palette: {
      primary: C.cyan,
      secondary: C.panel,
      accent: C.orange,
      neutral: C.bg,
      semantic: {
        text: C.text,
        muted: C.muted,
        line: C.line,
        panel2: C.panel2,
        green: C.green,
        red: C.red,
        purple: C.purple,
        blue: C.blue,
        yellow: C.yellow,
        white: C.white,
        black: C.black,
      },
    },
    typography: {
      headingFont: 'Arial',
      bodyFont: 'Arial',
      monoFont: 'Consolas',
      scaleRatio: 1.2,
    },
    spacing: { element: 16, section: 32, margin: { top: 44, right: 58, bottom: 44, left: 58 } },
    typographyScaleId: 'memory-dark-review-typography',
    paletteId: 'memory-dark-review-palette',
    lockedTokens: {
      titleBandHeight: 86,
      margins: { top: 44, right: 58, bottom: 44, left: 58 },
      spacing: { element: 16, section: 32 },
    },
  };
  const slides = slideSpecs.map((s, i) => ({
    id: s.id,
    title: s.title,
    sourceBlockRefs: [`block-${s.id}`],
    candidateAssetRefs: s.assets ?? [],
    contentClaims: s.claims.map((claim) => ({ claim, sourceBlockIds: [`block-${s.id}`] })),
    candidateAssetIds: s.assets ?? [],
    layoutIntent: `${s.layout} layout for dense exam review with stable top title band and compact panels.`,
    animationIntent: 'No required reveal animation; static PPTX must be fully readable.',
    speakerNotesIntent: s.notes.join(' '),
    outputConstraints: ['Must fit 1280x720 canvas.', 'Must be readable in PPTX export.', 'Use typed DSL elements and approved local assets only.'],
    design: {
      slideType: i === 0 ? 'title' : i === slideSpecs.length - 1 ? 'closing' : s.layout.includes('table') || s.layout === 'matrix' ? 'chart' : 'summary',
      layoutPatternId: s.layout,
      visualizationIntent: { type: s.layout, rationale: 'Dense academic review with formulas, tables, cards, or key screenshots.' },
      density: 'high',
    },
  }));
  jwrite(join(root, 'planning', 'deck-plan.json'), { projectSlug: 'memory-architecture-exam-review', slides, deckDesign });
}

function writeSlides() {
  slideSpecs.forEach((spec, i) => {
    const slide = spec.layout === 'title' ? titleSlide(spec, i + 1) : contentSlide(spec, i + 1);
    jwrite(join(slidesDir, `${spec.id}.json`), slide);
  });
}

function main() {
  const phase = process.argv[2] ?? 'all';
  ensureDirs();
  writeRequirements();
  writeInterviewPrd();
  writeExtraction();
  writeOutline();
  if (phase === 'plan') return;
  writeDeckPlan();
  writeSlides();
}

main();
