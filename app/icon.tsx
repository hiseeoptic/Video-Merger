import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
          background: "#0b0b10",
          color: "#baf263",
          border: "3px solid #8257ff",
          fontSize: 37,
          fontWeight: 900,
          letterSpacing: -4,
        }}
      >
        C›
      </div>
    ),
    size,
  );
}
