import { Camera, X } from "lucide-react";
import { RED } from "../../utils/helpers";

const PhotoGrid = ({ fotos, onAdd, onRemove }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {fotos.map((f, i) => (
      <div
        key={i}
        style={{
          position: "relative",
          width: 64,
          height: 64,
          borderRadius: 10,
          overflow: "hidden",
          border: "0.5px solid rgba(0,0,0,0.1)",
        }}
      >
        <img
          src={f}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {onRemove && (
          <button
            onClick={() => onRemove(i)}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              background: RED,
              color: "white",
              borderRadius: "0 0 0 8px",
              padding: 2,
              border: "none",
            }}
          >
            <X size={10} />
          </button>
        )}
      </div>
    ))}
    {onAdd && (
      <button
        onClick={onAdd}
        style={{
          width: 64,
          height: 64,
          borderRadius: 10,
          border: "2px dashed rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          color: "#8e8e93",
          background: "none",
        }}
      >
        <Camera size={16} />
        <span style={{ fontSize: 12 }}>Foto</span>
      </button>
    )}
  </div>
);

export default PhotoGrid;
