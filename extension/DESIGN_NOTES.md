# PromptFence Design Notes

Internal documentation for tone of voice, visual direction, and copy guidelines.

---

## Tone of Voice System

### Core Principles

1. **Calm Authority**
   - Confident, not apologetic
   - Direct without being aggressive
   - "This is a phone number" not "We think this might possibly be..."
   - "This preset is strict by design" not "Sorry, but we had to block..."

2. **Non-Assumptive Where Ambiguous**
   - Use "appears to be" or "looks like" for pattern-matched data
   - Use direct language for high-confidence detections (Luhn-valid cards, mod-97 IBANs)
   - Never assume intent: "detected" not "you tried to share"

3. **Educational, Not Moralizing**
   - Explain *why* something matters, not *that it's wrong*
   - "AI tools may retain conversations" not "You shouldn't share this"
   - Provide actionable alternatives, not just warnings

4. **User Agency First**
   - User retains final decision unless preset explicitly blocks
   - Always offer a path forward: edit, continue, or adjust settings
   - Never trap the user in a modal with no escape

### Language to Avoid

- Alarmist: "DANGER", "VIOLATION", "CRITICAL"
- Assumptive: "You tried to...", "You're about to..."
- Infantilizing: "Oops!", "Uh oh!", "Are you sure you want to...?"
- Guilt-inducing: "Think of the consequences", "This could be bad"
- Vague: "Something went wrong", "There's an issue"

### Language to Use

- Factual: "Detected", "Contains", "Includes"
- Non-assumptive: "This appears to be", "This looks like"
- Direct (high confidence): "This is a valid credit card number"
- Educational: "AI tools may store...", "This could be retained..."
- Actionable: "Edit message", "Replace with [example]", "Adjust settings"

---

## Preset Tone Guidelines

### Personal Safety (Default)
- **Tone**: Supportive, educational
- **Strictness**: Warns often, blocks rarely
- **Voice**: "Just a heads-up..." / "You're in control"
- **Goal**: Build awareness without friction

### Finance
- **Tone**: Firm but respectful
- **Strictness**: Strict by design
- **Voice**: "This mode is strict to reduce financial risk"
- **Goal**: Prevent accidental financial data exposure

### Health
- **Tone**: Protective, empathetic
- **Strictness**: Privacy-forward
- **Voice**: "Health information deserves extra care"
- **Goal**: Help users think twice without labeling them

### Workplace/HR
- **Tone**: Professional
- **Strictness**: Balanced
- **Voice**: "This may create professional risk"
- **Goal**: Awareness of colleague/client data

### Developer
- **Tone**: Practical, explicit
- **Strictness**: Relaxed on PII, strict on secrets
- **Voice**: "Detection is still active, but informational"
- **Goal**: Catch credentials without blocking workflow

---

## Modal Structure

### Standard Modal Components

1. **Icon** (optional): Visual cue for severity
2. **Title**: Factual, short (max 8 words)
3. **Body**: What was detected + why it matters
4. **Detected Items**: List with type name, risk context, anonymization tip
5. **Guidance Box**: Preset-specific messaging
6. **Actions**:
   - Primary: "Edit message" (always)
   - Secondary (WARN only): "Continue anyway" (muted)
   - Tertiary: "Settings" link

### Modal Copy Rules

- WARN modals: Inform, suggest, give choice
- BLOCK modals: Explain, educate, never shame
- Never use exclamation marks in titles
- Tips should be concrete: "Replace X with Y"

---

## Visual System Direction

### Colors

| Purpose | Light Mode | Dark Mode | Usage |
|---------|------------|-----------|-------|
| Base background | #ffffff | #1e293b | Modal background |
| Secondary bg | #f8fafc | #334155 | Type items, guidance |
| Text primary | #1e293b | #f1f5f9 | Titles, strong text |
| Text secondary | #64748b | #94a3b8 | Body, descriptions |
| Accent (action) | #2563eb | #3b82f6 | Primary buttons |
| Warning accent | #92400e | #fbbf24 | WARN titles |
| Block accent | #334155 | #e2e8f0 | BLOCK titles (neutral) |
| Finance accent | #b91c1c | #f87171 | Finance blocks only |
| Tip background | #fef9c3 | #422006 | Anonymization tips |

### Color Philosophy

- **No panic red** for standard blocks
- Red reserved **only** for Finance preset blocks
- Amber/yellow for warnings (attention, not alarm)
- Blue for actions (trust, calm)
- Neutral grays for blocks (serious, not aggressive)

### Shape Language

- Border radius: 10-16px (soft, approachable)
- Shadows: Subtle, layered (depth without drama)
- No sharp corners or hard edges
- Generous padding (breathing room)

### Typography

- System fonts for performance and native feel
- Clear hierarchy: 18px titles, 14px body, 12-13px supporting
- Line height: 1.4-1.6 for readability
- Weight: 600 for emphasis, 400-500 for body

### Animation

- Fade-in: 150ms ease-out
- Slide-up: 200ms ease-out
- Purpose: Polish, not distraction
- No bouncing, shaking, or attention-grabbing effects

---

## Data Type Descriptions

### Detection Labels (for modal display)

| Type | Label | High-Confidence Phrase | Low-Confidence Phrase |
|------|-------|----------------------|---------------------|
| EMAIL | Email address | "Contains an email address" | "This looks like an email address" |
| PHONE | Phone number | "Contains a phone number" | "This appears to be a phone number" |
| IBAN | Bank account (IBAN) | "This is a valid IBAN" | N/A (mod-97 validated) |
| CREDIT_CARD | Credit card number | "This is a valid card number" | N/A (Luhn validated) |
| ADDRESS | Physical address | "Contains address information" | "This looks like an address" |
| PASSWORD | Password or API key | "Contains credentials" | "This looks like a password or key" |

### Risk Context (why it matters)

| Type | Context |
|------|---------|
| EMAIL | "Email addresses can identify you or link conversations to your real identity." |
| PHONE | "Phone numbers are personal identifiers that may be retained in AI logs." |
| IBAN | "Bank account numbers are sensitive financial data that could enable fraud." |
| CREDIT_CARD | "Card numbers should never be shared with AI tools—serious financial risk." |
| ADDRESS | "Addresses reveal your location and can be combined with other data to identify you." |
| PASSWORD | "Credentials can compromise accounts if stored in AI systems." |

### Anonymization Tips

| Type | Tip | Example |
|------|-----|---------|
| EMAIL | "Use a placeholder address" | user@example.com |
| PHONE | "Use placeholder digits" | +XX XXX XXX XXX |
| IBAN | "Mask all but country code" | DE** **** **** **** |
| CREDIT_CARD | "Describe the issue instead" | "my Visa card" |
| ADDRESS | "Use general location" | [City, Country] |
| PASSWORD | "Replace with placeholder" | [redacted], sk-xxx... |

---

## First-Run Experience

The onboarding modal appears once per installation. It must:

1. Explain what PromptFence does (one sentence)
2. Reassure: local processing, no data sent
3. Emphasize user control
4. Be dismissible (Got it / Skip)
5. Link to settings for customization

Target: User understands the extension in under 30 seconds.

---

## Future Considerations

- Landing page accessible from extension icon
- Per-type toggle overrides
- Custom pattern definitions
- Export/import settings

---

*Last updated: February 2025*
