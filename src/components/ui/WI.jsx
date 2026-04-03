import { Sun, Cloud, CloudRain, CloudSnow, Wind } from "lucide-react";

const WI = ({ w, style: s }) => {
  const p = { style: s };
  return w === "sonnig" ? (
    <Sun {...p} />
  ) : w === "bewölkt" ? (
    <Cloud {...p} />
  ) : w === "regen" ? (
    <CloudRain {...p} />
  ) : w === "schnee" ? (
    <CloudSnow {...p} />
  ) : w === "wind" ? (
    <Wind {...p} />
  ) : (
    <Sun {...p} />
  );
};

export default WI;
