# Whipr BLE protocol notes

## Expected profile

Whipr’s crowdfunding materials state the base unit uses **FTMS** (Bluetooth Fitness Machine Service):

| Item | UUID |
|------|------|
| Fitness Machine Service | `0x1826` |
| Fitness Machine Feature | `0x2ACC` |
| Rower Data (notify) | `0x2AD1` |
| Training Status | `0x2AD3` |
| Fitness Machine Control Point | `0x2AD9` |
| Fitness Machine Status | `0x2ADA` |

Advertising name is often a variant of **Whipr**.

## How to verify on your unit

1. Power on the Whipr (fresh batteries help).
2. Open paddleerg in **Chrome** on Mac (`npm run web`).
3. Open **BLE Explorer** (bluetooth icon on the workout screen, or Settings) → **Connect**.
4. Confirm service `1826` appears and notifications arrive while paddling.
5. Prefer **Rower Data** (`2AD1`) payloads. If only Cross Trainer Data (`2ACE`) appears, note that in this file and extend the parser.

## Rower Data flags (UINT16, little-endian)

When bit 0 (**More Data**) is `0`, stroke rate (UINT8, 0.5 SPM resolution) and stroke count (UINT16) follow the flags.

Common optional bits:

- bit 2 Total Distance (UINT24 m)
- bit 3 Instantaneous Pace (UINT16 s/500m)
- bit 4 Average Pace
- bit 5 Instantaneous Power (SINT16 W)
- bit 6 Average Power
- bit 8 Expended Energy
- bit 11 Elapsed Time (UINT16 s)

See `src/ble/ftms.ts` for the implementation used by paddleerg.

## Findings from live device

_Fill in after first successful session:_

- Device name:
- Services observed:
- Data characteristic used:
- Sample hex (one notification):
- Quirks:
