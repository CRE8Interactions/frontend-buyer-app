import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Blocktickets — Sports-first ticketing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default Twitter card image (same layout as opengraph-image). */
export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#F4F5F7",
          padding: 36,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: "#FFFFFF",
            borderRadius: 28,
            overflow: "hidden",
            border: "1px solid #E6E8EE",
          }}
        >
          <div
            style={{
              width: 520,
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#051B35",
              color: "#FFFFFF",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Blocktickets
            </div>
            <div style={{ fontSize: 20, color: "#9DA2B3" }}>
              Sports-first ticketing
            </div>
          </div>
          <div
            style={{
              width: 608,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "48px 48px 44px 44px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  background: "#EEF0F4",
                  color: "#4B5563",
                  fontSize: 22,
                  fontWeight: 600,
                  padding: "10px 18px",
                  borderRadius: 999,
                  marginBottom: 28,
                }}
              >
                blocktickets.xyz
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 46,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  color: "#0B1220",
                }}
              >
                Sports-first ticketing for teams & venues
              </div>
            </div>
            <div
              style={{
                display: "flex",
                background: "#0B1220",
                color: "#FFFFFF",
                fontSize: 24,
                fontWeight: 700,
                padding: "16px 28px",
                borderRadius: 14,
              }}
            >
              Get Started
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
