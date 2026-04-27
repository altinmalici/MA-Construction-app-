import { CS } from "../../utils/helpers";

/**
 * iOS-Style Container: weißer Hintergrund, abgerundete Ecken, dezenter
 * Schatten. Standard-Padding 16, Border-Radius 12 — beide override-bar.
 *
 * Aus F-01 extrahiert (Tag 2). Nicht app-weit ausgerollt — wird Stück
 * für Stück ersetzt, wenn betroffene Screens sowieso angefasst werden.
 *
 *   <Card>...</Card>
 *   <Card padding={0}>...</Card>           // Listen-Container, no padding
 *   <Card style={{marginTop: 8}}>...</Card>
 */
const Card = ({
  children,
  padding = 16,
  radius = 12,
  style = {},
  ...rest
}) => (
  <div
    style={{
      background: "white",
      borderRadius: radius,
      padding,
      boxShadow: CS,
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
