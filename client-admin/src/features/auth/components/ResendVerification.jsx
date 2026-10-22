import { useState } from "react";
import urbuLogo from "../../../assets/img/UrBus-logo.png";
import { Spinner } from "./Spinner.jsx";
import { resendVerification } from "../../../shared/api";
import { showError, showSuccess } from "../../../shared/utils/toast.js";

const EmailIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="#9ca3af" strokeWidth="2" />
        <path d="M3 7l9 6 9-6" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

export const ResendVerification = ({ onNavigate }) => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim()) {
            showError("Por favor ingresa tu correo electrónico.");
            return;
        }

        setLoading(true);
        try {
            // El backend responde 200 con success:false si el usuario no existe o ya está verificado
            const { data } = await resendVerification(email.trim());
            if (!data?.success) {
                showError(data?.message || "No se pudo reenviar la verificación.");
                return;
            }
            setSent(true);
            showSuccess("Correo de verificación enviado.");
        } catch (err) {
            const message =
                err.response?.data?.errors?.[0]?.message ||
                err.response?.data?.message ||
                "Error al reenviar la verificación.";
            showError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
            Reenviar verificación
        </h1>
        <p className="text-center text-sm text-gray-500 mb-5 leading-relaxed">
            {sent
            ? "¡Correo enviado! Revisa tu bandeja de entrada para verificar tu cuenta."
            : "Ingresa tu correo para reenviar el enlace de verificación de cuenta."}
        </p>

        <div
            className="rounded-full border-[3px] bg-white overflow-hidden flex items-center justify-center shadow-md mb-6"
            style={{ borderColor: "#f0c030", width: 110, height: 110 }}
        >
            <img src={urbuLogo} alt="UrBus Logo" className="w-24 h-24 object-contain" />
        </div>

        {!sent && (
            <>
            <div className="flex items-center bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 gap-3 w-full">
                <EmailIcon />
                <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 outline-none text-gray-700 text-sm bg-transparent placeholder-gray-400"
                />
            </div>

            <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3.5 rounded-2xl font-semibold text-white text-base shadow-md mt-4 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg,#f5c518 0%,#e6a800 100%)" }}
            >
                {loading ? <Spinner size={20} color="#fff" /> : "Reenviar verificación"}
            </button>
            </>
        )}

        {sent && (
            <button
            onClick={() => onNavigate("login")}
            className="w-full py-3.5 rounded-2xl font-semibold text-white text-base shadow-md mt-4 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg,#f5c518 0%,#e6a800 100%)" }}
            >
            Volver al Login
            </button>
        )}

        <p className="text-center text-sm text-gray-500 mt-2">
            ¿Ya verificaste tu cuenta?{" "}
            <button onClick={() => onNavigate("login")} className="font-semibold" style={{ color: "#2196F3" }}>
            Ingresar
            </button>
        </p>
        </>
    );
}