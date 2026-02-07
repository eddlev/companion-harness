# Token Budgeting

Two main costs:
1) Overlay size (environment + policies + module registry)
2) State persistence (spine)

To reduce:
- keep the overlay stable; do not re-send large JSON every message
- use short “HREF” references to capsules
- only unpack capsule details on demand
- store transcripts externally; summarize into capsules

BinLing-style capsules are ideal here.
