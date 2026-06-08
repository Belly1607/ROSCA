import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import Sidebar from "./components/Sidebar";
import MemberForm from "./components/MemberForm";
import Home from "./pages/Home";
import Member from "./pages/Member";
import Loan from "./pages/Loan";
import Balance from "./pages/Balance";
import Report from "./pages/Report";
import "./page_css/Sidebar.css";
import "./page_css/NavBar.css";
import "./page_css/Home.css";
import "./App.css";
import "./page_css/Loan.css";
import "./page_css/Member.css";
import "./page_css/MemberForm.css";
import "./page_css/Report.css";
import "./page_css/Balance.css";

function App() {
    const user = {
        username: "admin"
    };

    return (
        <BrowserRouter>
            <div className="app">
                <NavBar user={user} />

                <div className="dashboard-layout">
                    <Sidebar />
                    <div className="main-content">
                        <main>
                            <Routes>
                                <Route path="/" element={<Navigate to="/home" />} />
                                <Route path="/home" element={<Home />} />
                                <Route path="/member" element={<Member />} />
                                <Route path="/loan" element={<Loan />} />
                                <Route path="/memberform" element={<MemberForm />} />
                                <Route path="/balance" element={<Balance />} />
                                <Route path="/report" element={<Report />} />
                            </Routes>
                        </main>
                    </div>
                </div>
            </div>
        </BrowserRouter>
    );
}

export default App;