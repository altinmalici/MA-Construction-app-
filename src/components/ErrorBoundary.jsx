import { Component } from "react";
import { logError } from "../lib/errorLog.js";

/**
 * App-weite Error Boundary. Faengt Render-/Lifecycle-Fehler in der
 * Komponenten-Struktur ab (inkl. der 20 Lazy-Screens), damit ein
 * unerwarteter Fehler NICHT zu einem komplett weissen Bildschirm auf der
 * Baustelle fuehrt, sondern zu einem verstaendlichen Hinweis mit Neustart.
 *
 * Bewusst dependency-arm gehalten (nur React, Inline-Styles, CSS-Klassen)
 * und ausserhalb des AppProviders platziert, damit der Fallback selbst dann
 * rendert, wenn der Fehler aus dem Context/Datenlade-Pfad kommt.
 *
 * Hook fuer spaeteres Monitoring (Sentry o.ae.): in componentDidCatch.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
    // An das Monitoring (error_log-Tabelle) melden — best-effort.
    logError(error?.message || "Render-Fehler", {
      stack: error?.stack,
      componentStack: info?.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="device-wrapper font-sans">
        <div className="device-frame">
          <div className="device-screen">
            <div
              role="alert"
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "#f2f2f7",
                padding: 24,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "#ff3b3015",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  fontSize: 28,
                }}
              >
                ⚠️
              </div>
              <h2
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#000",
                  marginBottom: 8,
                }}
              >
                Etwas ist schiefgelaufen
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#8e8e93",
                  marginBottom: 24,
                  maxWidth: 280,
                  lineHeight: 1.4,
                }}
              >
                Die App hatte einen unerwarteten Fehler. Starte sie neu – deine
                Daten sind sicher gespeichert.
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "14px 32px",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #8E3A9E, #A04878)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 15,
                  border: "none",
                  minHeight: 44,
                  cursor: "pointer",
                }}
              >
                App neu starten
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
