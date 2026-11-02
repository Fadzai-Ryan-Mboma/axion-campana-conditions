# AXION Campana design system

**Provenance.** Derived from the supplied AXION white logo, the AXION public-site palette (charcoal `#1C2124`, red `#DD3737`, black and white), the operational brief, and the supplied PERMAN data dashboard. It is an implementation design system, not an official AXION brand manual.

## Intent

An operations console for port-side planning: calm, precise, unmistakably industrial. The display favors legible numbers, time context, and source confidence over visual decoration.

## Tokens

| Role | Value | Use |
| --- | --- | --- |
| Ink | `#15191C` | Shell, headings, chart lines |
| Carbon | `#252C30` | Raised dark surfaces |
| Signal red | `#DD3737` | AXION accent, active controls |
| Fog | `#F3F5F4` | App canvas |
| Paper | `#FFFFFF` | Data panels |
| River | `#087E8B` | Water data and uncertainty |
| Sky | `#1976D2` | Weather data |
| Muted | `#657278` | Secondary labels |

Typography pairs **Space Grotesk** for operational hierarchy with **IBM Plex Mono** for measurements, timestamps, and source metadata. Panels use a 16px radius; data-grid rules are fine and cool gray. Motion is limited to a slow refresh indicator and respects reduced-motion preferences.

## Responsive behavior

Desktop uses a 12-column dashboard with the river chart as the primary working surface. Tablet shifts supporting panels beneath it. Mobile leads with the current snapshot, preserves the refresh/download controls, and turns dense tables into horizontally scrollable, labelled rows.
