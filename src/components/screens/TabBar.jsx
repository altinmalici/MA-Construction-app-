import {
  Home,
  Building2,
  Clock,
  Calendar,
  MoreHorizontal,
  User,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

const TabBar = () => {
  const { v, chef, setHistory, setVRaw } = useApp();
  const tabForView = {
    dash: "dash",
    bst: "bst",
    bsd: "bst",
    bsf: "bst",
    ste: "ste",
    mst: "dash",
    kal: "kal",
    mehr: "mehr",
    suo: "mehr",
    tag: "mehr",
    reg: "mehr",
    btb: "mehr",
    kos: "mehr",
    mng: "mehr",
    mat: "mehr",
    mit: "mehr",
    mitf: "mehr",
    sub: "mehr",
    notif: "mehr",
    dok: "bst",
    profil: chef ? "mehr" : "profil",
  };
  const activeTab = tabForView[v] || "dash";
  const tabs = chef
    ? [
        { id: "dash", i: Home, l: "Start" },
        { id: "bst", i: Building2, l: "Baustellen" },
        { id: "ste", i: Clock, l: "Stunden" },
        { id: "kal", i: Calendar, l: "Kalender" },
        { id: "mehr", i: MoreHorizontal, l: "Mehr" },
      ]
    : [
        { id: "dash", i: Home, l: "Start" },
        { id: "bst", i: Building2, l: "Baustellen" },
        { id: "ste", i: Clock, l: "Stunden" },
        { id: "profil", i: User, l: "Profil" },
      ];
  return (
    <div className="tab-bar">
      {tabs.map(({ id, i: I, l }) => (
        <button
          key={id}
          onClick={() => {
            setHistory([]);
            setVRaw(id);
          }}
          className={`tab-bar-item ${activeTab === id ? "active" : ""}`}
        >
          <I
            size={22}
            strokeWidth={activeTab === id ? 2.2 : 1.5}
            className="tab-icon"
          />
          <span className="tab-label">{l}</span>
        </button>
      ))}
    </div>
  );
};

export default TabBar;
