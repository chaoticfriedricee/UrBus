import { useState } from "react";
import { useLocation } from "react-router-dom";
import { resetPassword } from "../../../shared/api/auth";
import urbuLogo from "../../../assets/img/UrBus-logo.png";
import { Spinner } from "../components/Spinner.jsx";
 
function CloudBackground() {
    return (
        <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            aria-hidden
        >
            <svg
                viewBox="0 0 400 220"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full"
                preserveAspectRatio="xMidYMin slice"
            >
                <defs>
                    <linearGradient id="skyGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d6eaf8" />
                        <stop offset="100%" stopColor="#eaf4fb" />
                    </linearGradient>
                </defs>
 
                <rect width="400" height="220" fill="url(#skyGrad2)" />
 
                <ellipse
                    cx="80"
                    cy="80"
                    rx="70"
                    ry="38"
                    fill="#ddeef7"
                    opacity="0.8"
                />
 
                <ellipse
                    cx="110"
                    cy="68"
                    rx="48"
                    ry="30"
                    fill="#e8f4fa"
                    opacity="0.9"
                />
 
                <ellipse
                    cx="290"
                    cy="60"
                    rx="85"
                    ry="42"
                    fill="#ddeef7"
                    opacity="0.8"
                />
 
                <ellipse
                    cx="330"
                    cy="48"
                    rx="55"
                    ry="32"
                    fill="#e8f4fa"
                    opacity="0.9"
                />
            </svg>
        </div>
    );
}
 
const LockIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <rect
            x="5"
            y="11"
            width="14"
            height="10"
            rx="2"
            stroke="#9ca3af"
            strokeWidth="2"
        />
 
        <path
            d="M8 11V7a4 4 0 018 0v4"
            stroke="#9ca3af"
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);
 
export const ResetPasswordPage = () => {
    const location = useLocation();
 
    const token = new URLSearchParams(location.search).get("token");
 
    const [password, setPassword] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
 
    const handleReset = async () => {
        if (!password || !confirmar) {
            alert("Completa todos los campos");
            return;
        }
 
        if (password.length < 8) {
            alert("La contraseña debe tener al menos 8 caracteres");
            return;
        }
 
        if (password !== confirmar) {
            alert("Las contraseñas no coinciden");
            return;
        }
 
        if (!token) {
            alert("Token inválido o expirado");
            return;
        }
 
        try {
            setLoading(true);
 
            // El backend responde 200 con success:false si el token es inválido o expiró
            const { data } = await resetPassword(token, password);
 
            if (!data?.success) {
                alert(data?.message || "Token inválido o expirado");
                return;
            }
 
            setDone(true);
 
        } catch (error) {
            console.error(error);
 
            alert(
                error.response?.data?.errors?.[0]?.message ||
                error.response?.data?.message ||
                "Error al restablecer contraseña"
            );
 
        } finally {
            setLoading(false);
        }
    };
 
    return (
        <div
            className="min-h-screen w-full flex items-center justify-center"
            style={{ background: "#eaf4fb" }}
        >
            <div className="relative w-full max-w-sm mx-auto min-h-screen md:min-h-0 flex flex-col">
 
                <div
                    className="relative overflow-hidden md:rounded-3xl md:shadow-xl flex-1 flex flex-col"
                    style={{ background: "#eaf4fb" }}
                >
                    <CloudBackground />
 
                    <div className="relative z-10 flex flex-col items-center px-7 pt-10 pb-10 gap-1 flex-1">
 
                        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
                            Restablecer contraseña
                        </h1>
 
                        <p className="text-center text-sm text-gray-500 mb-5 leading-relaxed">
                            {
                                done
                                    ? "¡Contraseña actualizada! Ya puedes iniciar sesión."
                                    : "Ingresa tu nueva contraseña."
                            }
                        </p>
 
                        <div
                            className="rounded-full border-[3px] bg-white overflow-hidden flex items-center justify-center shadow-md mb-6"
                            style={{
                                borderColor: "#f0c030",
                                width: 110,
                                height: 110
                            }}
                        >
                            <img
                                src={urbuLogo}
                                alt="UrBus Logo"
                                className="w-24 h-24 object-contain"
                            />
                        </div>
 
                        {!done && (
                            <>
                                <div className="flex flex-col gap-3 w-full">
 
                                    <div className="flex items-center bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 gap-3">
                                        <LockIcon />
 
                                        <input
                                            type="password"
                                            placeholder="Nueva contraseña"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="flex-1 outline-none text-gray-700 text-sm bg-transparent placeholder-gray-400"
                                        />
                                    </div>
 
                                    <div className="flex items-center bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 gap-3">
                                        <LockIcon />
 
                                        <input
                                            type="password"
                                            placeholder="Confirmar contraseña"
                                            value={confirmar}
                                            onChange={(e) => setConfirmar(e.target.value)}
                                            className="flex-1 outline-none text-gray-700 text-sm bg-transparent placeholder-gray-400"
                                        />
                                    </div>
 
                                </div>
 
                                <button
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-2xl font-semibold text-white text-base shadow-md mt-4 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                    style={{
                                        background:
                                            "linear-gradient(135deg,#f5c518 0%,#e6a800 100%)"
                                    }}
                                >
                                    {
                                        loading
                                            ? <Spinner size={20} color="#fff" />
                                            : "Restablecer contraseña"
                                    }
                                </button>
                            </>
                        )}
 
                        {done && (
                            <a
                                href="/"
                                className="w-full py-3.5 rounded-2xl font-semibold text-white text-base shadow-md mt-4 flex items-center justify-center active:scale-95 transition-transform"
                                style={{
                                    background:
                                        "linear-gradient(135deg,#f5c518 0%,#e6a800 100%)"
                                }}
                            >
                                Ir al Login
                            </a>
                        )}
 
                    </div>
                </div>
            </div>
        </div>
    );
};
