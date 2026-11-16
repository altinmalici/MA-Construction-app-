import { lazy, Suspense } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Spinner } from "./components/ui";
import ErrorBoundary from "./components/ErrorBoundary";
import { importWithReload } from "./lib/pwaUpdate.js";
import { useKeyboardScroll } from "./hooks/useKeyboardScroll.js";

// Eager: kritischer Pfad — Login direkt nach Start, Dash direkt danach,
// TabBar dauerhaft sichtbar. Alles andere wird on-demand geladen.
import Login from "./components/screens/Login";
import Dash from "./components/screens/Dash";
import TabBar from "./components/screens/TabBar";

// Lazy: 20 Screens. React lädt den Chunk beim ersten Aufruf der Route nach
// und behält ihn dann im Memory; zweiter Besuch ist sofort.
const BstList = lazy(importWithReload(() => import("./components/screens/BstList")));
const BstDet = lazy(importWithReload(() => import("./components/screens/BstDet")));
const BstForm = lazy(importWithReload(() => import("./components/screens/BstForm")));
const SteView = lazy(importWithReload(() => import("./components/screens/SteView")));
const MeineStd = lazy(importWithReload(() => import("./components/screens/MeineStd")));
const MngView = lazy(importWithReload(() => import("./components/screens/MngView")));
const BtbView = lazy(importWithReload(() => import("./components/screens/BtbView")));
const DokView = lazy(importWithReload(() => import("./components/screens/DokView")));
const MatView = lazy(importWithReload(() => import("./components/screens/MatView")));
const NotifView = lazy(importWithReload(() => import("./components/screens/NotifView")));
const KalView = lazy(importWithReload(() => import("./components/screens/KalView")));
const TagView = lazy(importWithReload(() => import("./components/screens/TagView")));
const RegView = lazy(importWithReload(() => import("./components/screens/RegView")));
const KostenView = lazy(importWithReload(() => import("./components/screens/KostenView")));
const MitView = lazy(importWithReload(() => import("./components/screens/MitView")));
const MitForm = lazy(importWithReload(() => import("./components/screens/MitForm")));
const SubView = lazy(importWithReload(() => import("./components/screens/SubView")));
const ProfilView = lazy(importWithReload(() => import("./components/screens/ProfilView")));
const StundenUebersicht = lazy(importWithReload(() => import("./components/screens/StundenUebersicht")));
const MehrView = lazy(importWithReload(() => import("./components/screens/MehrView")));

const ScreenLoader = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      width: "100%",
    }}
  >
    <Spinner size={28} />
  </div>
);

function AppRouter() {
  const { v, cu, locked } = useApp();
  useKeyboardScroll();
  return (
    <>
      {/* inert: gesperrter Screen ist weder tipp- noch fokussierbar. */}
      <div style={{ flex: 1, minHeight: 0 }} inert={locked} aria-hidden={locked || undefined}>
        {/* Ein View-Wechsel entfernt den alten Screen samt lokalem State.
            Die Sperre wechselt deshalb NICHT den View, sondern legt den
            PIN-Screen darüber (unten) — Formular-Eingaben bleiben erhalten. */}
        <div className="view-fade">
          <Suspense fallback={<ScreenLoader />}>
            {v === "login" && <Login />}
            {v === "dash" && <Dash />}
            {v === "profil" && <ProfilView />}
            {v === "bst" && <BstList />}
            {v === "bsd" && <BstDet />}
            {v === "bsf" && <BstForm />}
            {v === "ste" && <SteView />}
            {v === "mst" && <MeineStd />}
            {v === "mng" && <MngView />}
            {v === "btb" && <BtbView />}
            {v === "dok" && <DokView />}
            {v === "mat" && <MatView />}
            {v === "notif" && <NotifView />}
            {v === "kal" && <KalView />}
            {v === "suo" && <StundenUebersicht />}
            {v === "tag" && <TagView />}
            {v === "reg" && <RegView />}
            {v === "kos" && <KostenView />}
            {v === "mit" && <MitView />}
            {v === "mitf" && <MitForm />}
            {v === "sub" && <SubView />}
            {v === "mehr" && <MehrView />}
          </Suspense>
        </div>
      </div>
      {cu && !locked && <TabBar />}
      {locked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="App gesperrt"
          style={{
            // .device-screen ist position:relative → deckt genau den
            // App-Bereich ab (auch in der Desktop-Simulation).
            position: "absolute",
            inset: 0,
            // über allen Modals (ConfirmModal 1000, Lightbox 300)
            zIndex: 5000,
            background: "#f2f2f7",
          }}
        >
          <Login />
        </div>
      )}
    </>
  );
}

export default function MAConstructionApp() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </ErrorBoundary>
  );
}
