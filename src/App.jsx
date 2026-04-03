import { AppProvider, useApp } from "./context/AppContext";
import Login from "./components/screens/Login";
import Dash from "./components/screens/Dash";
import BstList from "./components/screens/BstList";
import BstDet from "./components/screens/BstDet";
import BstForm from "./components/screens/BstForm";
import SteView from "./components/screens/SteView";
import MeineStd from "./components/screens/MeineStd";
import MngView from "./components/screens/MngView";
import BtbView from "./components/screens/BtbView";
import DokView from "./components/screens/DokView";
import MatView from "./components/screens/MatView";
import NotifView from "./components/screens/NotifView";
import KalView from "./components/screens/KalView";
import TagView from "./components/screens/TagView";
import RegView from "./components/screens/RegView";
import KostenView from "./components/screens/KostenView";
import MitView from "./components/screens/MitView";
import MitForm from "./components/screens/MitForm";
import SubView from "./components/screens/SubView";
import ProfilView from "./components/screens/ProfilView";
import StundenUebersicht from "./components/screens/StundenUebersicht";
import MehrView from "./components/screens/MehrView";
import TabBar from "./components/screens/TabBar";

function AppRouter() {
  const { v, cu } = useApp();
  return (
    <>
      <div style={{ flex: 1, minHeight: 0 }}>
        <div key={v} className="view-fade">
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
