import { lazy, Suspense } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Spinner } from "./components/ui";

// Eager: kritischer Pfad — Login direkt nach Start, Dash direkt danach,
// TabBar dauerhaft sichtbar. Alles andere wird on-demand geladen.
import Login from "./components/screens/Login";
import Dash from "./components/screens/Dash";
import TabBar from "./components/screens/TabBar";

// Lazy: 20 Screens. React lädt den Chunk beim ersten Aufruf der Route nach
// und behält ihn dann im Memory; zweiter Besuch ist sofort.
const BstList = lazy(() => import("./components/screens/BstList"));
const BstDet = lazy(() => import("./components/screens/BstDet"));
const BstForm = lazy(() => import("./components/screens/BstForm"));
const SteView = lazy(() => import("./components/screens/SteView"));
const MeineStd = lazy(() => import("./components/screens/MeineStd"));
const MngView = lazy(() => import("./components/screens/MngView"));
const BtbView = lazy(() => import("./components/screens/BtbView"));
const DokView = lazy(() => import("./components/screens/DokView"));
const MatView = lazy(() => import("./components/screens/MatView"));
const NotifView = lazy(() => import("./components/screens/NotifView"));
const KalView = lazy(() => import("./components/screens/KalView"));
const TagView = lazy(() => import("./components/screens/TagView"));
const RegView = lazy(() => import("./components/screens/RegView"));
const KostenView = lazy(() => import("./components/screens/KostenView"));
const MitView = lazy(() => import("./components/screens/MitView"));
const MitForm = lazy(() => import("./components/screens/MitForm"));
const SubView = lazy(() => import("./components/screens/SubView"));
const ProfilView = lazy(() => import("./components/screens/ProfilView"));
const StundenUebersicht = lazy(() => import("./components/screens/StundenUebersicht"));
const MehrView = lazy(() => import("./components/screens/MehrView"));

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
  const { v, cu } = useApp();
  return (
    <>
      <div style={{ flex: 1, minHeight: 0 }}>
        <div key={v} className="view-fade">
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
      {cu && <TabBar />}
    </>
  );
}

export default function MAConstructionApp() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
