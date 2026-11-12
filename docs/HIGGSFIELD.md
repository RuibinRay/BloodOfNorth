# Higgsfield integration

**State: client built, not yet working. No asset has been generated and nothing has been charged.**

## What was checked (11 Nov 2026)

| Route | Result |
|---|---|
| Higgsfield connector in this Claude session | Connected, read-only. Workspace has 280 credits on the Starter plan. It can list models and past generations; it cannot generate, upload or purchase. |
| Official API, `https://api.higgsfield.ai` | Reached. Authentication is `Authorization: Key <key id>:<key secret>`. |
| The supplied key | **Rejected with `401 Invalid credentials`** on the free status and estimate endpoints, tried as key-only, as `id:id`, as Bearer, and through the legacy `hf-api-key` / `hf-secret` headers. |
| 3D generation | Not in the public API catalogue (it documents image and video models). The 3D models (Meshy 7, Tripo, Hunyuan3D, rigging) appear in the connector's catalogue, which this session can read but not run. |

The likely cause: an API credential is a pair, and only one half was supplied.

## To finish the connection

1. Open https://console.higgsfield.ai and create a key. It shows a **key ID** and a **secret** (the secret once only).
2. Put both in `.env` (git-ignored, already created):
   ```
   HF_API_KEY_ID=...
   HF_API_KEY_SECRET=...
   ```
3. Check it, free of charge:
   ```bash
   npm run hf -- auth
   ```
4. Price a slot, then generate it:
   ```bash
   npm run hf -- estimate keyart_menu
   ```
   ```bash
   npm run hf -- generate keyart_menu --yes
   ```

API usage is billed in dollars from the Console balance, which is separate from the 280 app credits.
`generate` always prints the estimate first and does nothing without `--yes`.

Because the key was pasted into a chat, consider rotating it in the Console.

## Pipeline

`assets/registry.json` lists every art slot with its prompt, the model to use and the procedural
placeholder it replaces.

1. **Reference image** — official API via `tools/higgsfield.mjs` (11 slots: key art, four environments,
   the Eirik age sheet, Ragnar, Ylva, Håkon, longhouse, longship, the axe).
2. **Image to 3D** — Higgsfield app or MCP (Meshy 7 image-to-3D with PBR; rigging for characters). Four slots.
3. **Clean-up** — Blender: scale, origin, collision proxy, two LODs. Blender is not installed on this machine.
4. **Import** — GLB into `assets/models/`, mark the slot `imported`. The in-game loader that swaps a
   placeholder for a GLB is **not written yet**; it is the first task once a real asset exists to test with.

A generated image or video is reference material. Gameplay spaces and characters stay real-time 3D.
