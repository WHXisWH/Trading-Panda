# Panda Avatar Asset Layering Specification

> Version: 1.1  
> Date: 2026-06-08  
> Scope: `frontend/public/assets/panda/` PNG assets, `experience-rig.json`, and Panda avatar rendering.

## Goal

Panda avatar assets must be composable without covering the wrong body part. The previous one-PNG-per-attribute approach produced large transparent bounding boxes and mixed several visual ideas in a single image, which made anchors impossible to tune reliably.

The new rule is:

```text
One attribute can have multiple semantic sublayers.
One sublayer contains exactly one visual element.
One sublayer has exactly one anchor policy.
One sublayer must keep a small, target-specific alpha bbox.
```

This applies to:

1. `boldness`
2. `contrarian`
3. `focus`
4. `intuition`
5. `patience`
6. `emotions`

`experience` remains the full panda identity base and provides the real rig through `experience-rig.json`.

## Production Art Direction

The approved production direction is **cyber designer-toy panda accessories**.

Non-experience layers must look like very small, polished collectible-toy parts rather than broad character paintings. They can have a little exaggerated motion, but must stay precise, compact, and face-safe.

Production visual rules:

1. Use tiny, refined cyber accessories and micro effects.
2. Keep each part readable at 128px and polished at 384px.
3. Prefer black chrome, graphite metal, lacquer red, cyan/teal LEDs, jade green, warm amber micro highlights, and small magenta accents.
4. Do not use broad Chinese ink wash styling as the primary production look. Ink/brush texture may exist only as a very subtle material accent if it does not make the asset look like an old placeholder.
5. Do not cover or redraw the panda face unless the layer is an `emotions/*` facial sublayer.
6. Do not generate a finished avatar in trait layers. Generate one small composable asset only.

The current generated PNG set should be treated as an engineering smoke fixture until regenerated under this direction.

## Required Coordinate Source

All non-experience layers must position from `frontend/public/assets/panda/experience-rig.json`.

The authoritative landmarks are:

| Landmark | Meaning |
|---|---|
| `faceRect` | Face/head visible semantic area |
| `leftEye` | Left eye target area for primary emotion features |
| `rightEye` | Right eye target area for primary emotion features |
| `nose` | Nose target; normally preserved from base |
| `mouth` | Mouth target area for emotion layer |
| `bodyRect` | Visible torso/body region |
| `headCenter` | Head orientation center |
| `feetBase` | Ground contact baseline |

Do not use idealized hard-coded coordinates for final rendering.

## Directory Model

The old model:

```text
traits/boldness/tier-03.png
traits/intuition/tier-07.png
emotions/tier-06.png
```

is not expressive enough because one file can mix head, body, aura, and face elements.

The target model is:

```text
assets/panda/
  experience/
    tier-01.png
    ...
    tier-10.png
  experience-rig.json

  traits/
    boldness/
      headband/tier-01.png
      cape/tier-01.png
      weapon/tier-01.png
    contrarian/
      aura/tier-01.png
      mark/tier-01.png
    focus/
      monocle/tier-01.png
      headband/tier-01.png
      chest-core/tier-01.png
    intuition/
      ear-radar/tier-01.png
      particles/tier-01.png
      halo/tier-01.png
    patience/
      ground-prop/tier-01.png
      bamboo/tier-01.png
      tea/tier-01.png

  emotions/
    eyes/tier-01.png
    brows/tier-01.png
    mouth/tier-01.png
    extras/tier-01.png
```

Subfolders may be added only when a new single-purpose visual element has a clear anchor.

## Attribute Sublayer Rules

### Boldness

Visual meaning: courage, aggression, decisive action.

Production motif: kinetic red/black cyber headwear, compact shoulder motion, and side-only weapon silhouettes. Motion is allowed, but must never cross the face.

Allowed sublayers:

| Sublayer | Anchor | Bbox rule |
|---|---|---|
| `headband` | `faceRect.topCenter`, slightly above eyes | Must not intersect `leftEye` or `rightEye` |
| `cape` | upper `bodyRect` / shoulder area | Must not cover more than 10% of either eye rect |
| `weapon` | body side anchor, future hand anchor when available | Must stay outside `faceRect` unless intentionally behind head |

Forbidden:

- Full panda image
- Headband + cape + weapon in one PNG
- Large diagonal elements crossing the eyes

### Contrarian

Visual meaning: reversal, anti-consensus, anomaly.

Production motif: asymmetric black-white reversal charms, compact glitch arcs, and abstract red seal tokens. Avoid large smoke clouds as the default look.

Allowed sublayers:

| Sublayer | Anchor | Bbox rule |
|---|---|---|
| `aura` | `bodyRect.center` or whole-character outer ring | May be large, but visible pixels should mostly stay outside face/body silhouette |
| `mark` | side of `bodyRect` or above shoulder | Must not cover eyes/mouth |

Forbidden:

- Symbols directly on eyes
- Dense smoke over face
- Full-background image with opaque corners

### Focus

Visual meaning: concentration, precision, analysis.

Production motif: analytical micro devices, open-frame monocles, calibration ticks, and compact chest modules. Eye-adjacent parts must remain open so the base eye stays visible.

Allowed sublayers:

| Sublayer | Anchor | Bbox rule |
|---|---|---|
| `monocle` | `rightEye.center` | May surround `rightEye`, but must not replace the eye |
| `headband` | `faceRect.topCenter` | Must stay above eye centers |
| `chest-core` | upper `bodyRect.center` | Must stay below `faceRect.bottom` |

Forbidden:

- Monocle + chest core in one PNG
- Any full-face overlay
- Replacing both eyes

### Intuition

Visual meaning: instinct, sensing, market awareness.

Important decision: **intuition must not be eye-related**. Eye semantics belong to `emotions`.

Production motif: ear-radar clips, head-perimeter signal arcs, sensing particles, and small external halo pieces. It should read as market sensing, not eye power.

Allowed sublayers:

| Sublayer | Anchor | Bbox rule |
|---|---|---|
| `ear-radar` | future ear anchors; temporarily `headCenter` with side offset | Must stay outside `leftEye` / `rightEye` / `mouth` |
| `particles` | around `faceRect` outer boundary | Must not draw pupils, eyes, eyebrows, or gaze direction |
| `halo` | above `headCenter` | Must not cover eyes or mouth |

Forbidden:

- Eyes
- Pupils
- Eyebrows
- Eye glow
- Eye rings
- Gaze beams
- Any element that changes perceived facial expression

If a generated intuition image makes the panda look like it has a different expression, reject it.

### Patience

Visual meaning: calm, waiting, long-term discipline.

Production motif: small cyber zen ground props, tea props, jade-lit bamboo charms, and restrained circuit-steam lines. Keep these props low or beside the body.

Allowed sublayers:

| Sublayer | Anchor | Bbox rule |
|---|---|---|
| `ground-prop` | `feetBase` | Must stay near ground |
| `bamboo` | `feetBase` with side offset | May rise beside body, but must not cover face |
| `tea` | ground or future hand anchor | Must not float across eyes/mouth |

Forbidden:

- Face overlays
- Full-body calm aura that hides expression
- Handheld prop without a hand anchor, unless positioned as ground prop

### Emotions

Visual meaning: current facial expression.

Emotions are the only system allowed to alter primary facial semantics.

Production motif: tiny face-edge accents and small facial components, such as stress droplets, blush ticks, micro pulse marks, and controlled eye/brow/mouth marks.

Allowed sublayers:

| Sublayer | Anchor | Bbox rule |
|---|---|---|
| `eyes` | `leftEye` and `rightEye` | Must stay inside or near eye rects |
| `brows` | above `leftEye` / `rightEye` | Must stay in upper `faceRect` |
| `mouth` | `mouth` | Must stay around mouth rect |
| `extras` | near face, emotion-specific | Tears/sweat/coins must not cover unrelated traits |

Forbidden:

- Full face PNG
- Full panda PNG
- Body props
- Duplicating non-emotion trait effects

Nose policy: preserve the base nose by default. Only redraw the nose if a specific emotion requires it and the nose sublayer is explicitly declared.

## Bbox Quality Gates

Every final transparent PNG must pass these checks:

1. Transparent background.
2. No text, watermark, or scenery background.
3. No complete panda except `experience`.
4. Alpha bbox must be close to the declared anchor target.
5. Alpha bbox must not cover unrelated landmarks beyond threshold.
6. Corners must be transparent.
7. Final asset dimensions must be consistent across the asset set.

Recommended thresholds:

| Layer type | Hard fail condition |
|---|---|
| `headband` | Intersects either eye rect by more than 5% |
| `cape` | Intersects either eye rect by more than 10% |
| `monocle` | Covers both eyes |
| `chest-core` | Intersects `faceRect` |
| `intuition/*` | Intersects eyes or mouth by more than 5% |
| `patience/ground-prop` | Center is above `bodyRect.y` |
| `emotions/eyes` | Center not near `leftEye` / `rightEye` |
| `emotions/mouth` | Center not near `mouth` |

Large alpha bbox is not automatically wrong for `aura`, but the visible pixels must remain visually peripheral and must not hide facial readability at 128px.

## Prompt Contract

Every image generation prompt must include:

```text
Use case: stylized-concept.
Asset type: project-bound PNG material for TradingPanda canvas compositing.
Primary style: cyber designer-toy panda accessory, tiny but premium, polished micro-detail.
Single visual element only.
No full panda.
No full face.
No text or watermark.
Designed for 512x512 avatar compositing.
Element anchor: <anchor-name>.
Keep alpha bounding box tight around the element.
Do not cover eyes, mouth, or nose unless this is an emotion sublayer.
Create on a perfectly flat solid #ff00ff chroma-key background for background removal.
The background must be one uniform color with no shadows, gradients, texture, lighting variation, border, frame, floor, reflection, or cast shadow.
Do not use #ff00ff anywhere in the subject.
```

Additional intuition prompt clause:

```text
This is not an eye, pupil, eyebrow, gaze, or eye glow asset.
Do not alter facial expression.
Represent intuition using ear radar, head-perimeter signal arcs, ambient particles, halo, or external sensing symbols only.
```

Additional emotion prompt clause:

```text
This is a facial expression sublayer.
Only draw the requested eyes, brows, mouth, or small emotion extras.
Do not draw body, props, aura, or a complete face.
```

### Approved Sample Prompts

These prompts lock the first production art direction. Use them as the baseline style and constraint level before expanding to full tier batches.

#### `boldness/headband`

```text
Create a very small premium cyber designer-toy accessory for a TradingPanda avatar: a narrow cinnabar-red and black-chrome kinetic headband arc placed high above the forehead, with two short nanofiber ribbon tails whipping upward toward the upper-right side. Add tiny amber LED studs, brushed metal trim, and subtle motion streaks. The feeling is brave, decisive, and slightly aggressive, but the piece must stay compact and never cross the eyes, eyebrows, nose, or mouth.

Style: cyber collectible toy, polished lacquer, graphite metal, precise micro-detail, crisp silhouette readable at 128px, high-end game avatar accessory.
Output: single accessory only, no panda body, no full face.
Background: perfectly flat solid #ff00ff chroma-key, no shadow, no gradient, no text, no watermark.
```

#### `focus/monocle`

```text
Create a tiny open-frame cyber monocle module for the right-eye area of a TradingPanda avatar. It is a thin transparent cyan lens rim with bamboo-inspired black titanium brackets, tiny holographic calibration ticks, and one delicate chain-like data wire trailing toward the temple. The center of the monocle must remain open and transparent so the panda eye is still visible; do not replace or redraw the eye.

Style: precise analytical cyber toy accessory, black titanium, cool cyan micro LEDs, minimal but luxurious, readable at small avatar size.
Output: single accessory only, no full face, no second-eye overlay.
Background: perfectly flat solid #ff00ff chroma-key, no shadow, no gradient, no text, no watermark.
```

#### `intuition/ear-radar`

```text
Create a pair of very small cyber intuition ear-radar charms for a TradingPanda avatar: two crescent-shaped graphite antenna clips floating near the outer ear positions, with three thin teal signal arcs and a few tiny gold-green data sparks around the head perimeter. The effect suggests instinct and market sensing, not eye power. Keep all visible elements outside the eye, eyebrow, nose, and mouth areas.

Style: cyber designer toy, delicate sensor jewelry, teal neon, gold-green micro glints, polished black metal, light dynamic motion.
Output: accessory particles only, no eyes, no pupils, no gaze beams, no full panda.
Background: perfectly flat solid #ff00ff chroma-key, no shadow, no gradient, no text, no watermark.
```

#### `patience/tea`

```text
Create a tiny cyber zen tea prop for a TradingPanda avatar, positioned near the feet: a small matte obsidian tea cup with a jade LED rim, two thin steam lines shaped like circuit traces, and one miniature chrome bamboo leaf charm attached to the cup. It should feel calm, disciplined, and premium, with no large aura and no floating face-level elements.

Style: cyber collectible toy prop, black ceramic, jade green light, restrained warm amber highlights, very refined micro-detail.
Output: single ground-side prop only, no panda body, no face overlay.
Background: perfectly flat solid #ff00ff chroma-key, no shadow, no gradient, no text, no watermark.
```

#### `contrarian/mark`

```text
Create a very small asymmetric contrarian reversal charm for the shoulder-side area of a TradingPanda avatar: a black-white split square seal token with a slight glitch offset, one tiny cinnabar-red abstract mark, and two broken neon arcs curving outward from the body edge. It should feel anti-consensus and rebellious, but remain compact and not become a smoke cloud.

Style: cyber designer toy accessory, black lacquer, white enamel, red seal accent, subtle glitch energy, premium sharp edges.
Output: single side charm only, no readable characters, no face symbols, no full panda.
Background: perfectly flat solid #ff00ff chroma-key, no shadow, no gradient, no text, no watermark.
```

#### `emotions/extras`

```text
Create a tiny cyber emotion accent for the cheek-edge or temple-edge area of a TradingPanda avatar: one small translucent cyan stress droplet, one magenta micro pulse tick, and two tiny pixel-like light glints. The effect should communicate current emotional pressure without changing the whole facial expression. Keep it small, side-positioned, and never cover the eyes, nose, or mouth.

Style: cyber collectible toy facial extra, glossy gel material, cyan and magenta micro LEDs, cute but premium, clean readable silhouette.
Output: small face-edge accent only, no full face, no full panda, no body props.
Background: perfectly flat solid #ff00ff chroma-key, no shadow, no gradient, no text, no watermark.
```

## Render Order

Target render order:

```text
background
contrarian/aura
patience/ground-prop
experience base
boldness/cape
boldness/weapon
patience/bamboo
focus/chest-core
boldness/headband
focus/headband
focus/monocle
emotions/eyes
emotions/brows
emotions/mouth
emotions/extras
intuition/ear-radar
intuition/particles
intuition/halo
final highlights
```

Render order can be tuned per sublayer, but semantic ownership should not change.

## Migration Plan

1. Keep existing `experience` base and `experience-rig.json`.
2. Replace each current broad trait PNG with semantic sublayers.
3. Update the asset manifest from attribute-level entries to sublayer-level entries.
4. Update renderer transforms to choose anchor by sublayer, not only by attribute.
5. Add QA checks for alpha bbox vs landmark overlap.
6. Update `/panda-lab/qa` to show each sublayer independently and in final composition.
7. Reject any generated asset that violates the single-element rule.

## Current Known Risk

Existing files such as `traits/boldness/tier-03.png` and several `traits/intuition/tier-*.png` were generated under the old broad-layer model. They may contain large bbox coverage or expression-like elements. These should be treated as temporary assets and regenerated under this specification.
