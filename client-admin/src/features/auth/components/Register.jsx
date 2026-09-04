import { useState } from "react";
import urbuLogo from "../../../assets/img/UrBus-logo.png";
import { Spinner } from "./Spinner.jsx";
import { useAuthStore } from "../store/authStore.js";
import { showError, showSuccess } from "../../../shared/utils/toast.js";

function InputField({ type = "text", placeholder, value, onChange, icon }) {
    return (
        <div className="flex items-center bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 gap-3">
        <span className="text-gray-400 flex-shrink-0">{icon}</span>
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 outline-none text-gray-700 text-sm bg-transparent placeholder-gray-400"
        />
        </div>
    );
}

const UserIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" stroke="#9ca3af" strokeWidth="2" />
        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
    </svg>
);
const EmailIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="#9ca3af" strokeWidth="2" />
        <path d="M3 7l9 6 9-6" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
    </svg>
);
const PhoneIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <rect x="7" y="2" width="10" height="20" rx="2" stroke="#9ca3af" strokeWidth="2" />
        <circle cx="12" cy="18" r="1" fill="#9ca3af" />
    </svg>
);
const LockIcon = () => (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="#9ca3af" strokeWidth="2" />
        <path d="M8 11V7a4 4 0 018 0v4" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

export const Register = ({ onNavigate }) => {
    const [nombre, setNombre] = useState("");
    const [apellido, setApellido] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [telefono, setTelefono] = useState("");
    const [password, setPassword] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [foto, setFoto] = useState(null);
    const [fotoFile, setFotoFile] = useState(null);

    const { register, loading } = useAuthStore();

    const handleRegister = async () => {
        if (!nombre.trim() || !apellido.trim() || !username.trim() || !email.trim() || !telefono.trim() || !password.trim()) {
            showError("Por favor completa todos los campos.");
            return;
        }
        if (password !== confirmar) {
            showError("Las contraseñas no coinciden.");
            return;
        }
        if (password.length < 8 || password.length > 50) {
            showError("La contraseña debe tener entre 8 y 50 caracteres.");
            return;
        }
        if (telefono.length !== 8) {
            showError("El teléfono debe tener 8 dígitos.");
            return;
        }

        const formData = new FormData();
        formData.append("name", nombre);
        formData.append("surname", apellido);
        formData.append("username", username);
        formData.append("email", email);
        formData.append("phone", telefono);
        formData.append("password", password);
        if (fotoFile) {
            formData.append("profilePicture", fotoFile);
        }

        const result = await register(formData);

        if (result.success) {
            showSuccess("¡Registro exitoso! Revisa tu correo para verificar tu cuenta.");
            onNavigate("resend");
        } else {
            showError(result.error || "Error al registrar usuario");
        }
    };

    const handleFotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setFoto(url);
        setFotoFile(file);
    };

    return (
        <>
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-5">Registro</h1>

        <label className="relative cursor-pointer mb-6 group" style={{ width: 120, height: 120 }}>
            <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFotoChange}
            />
            <div
            className="w-full h-full rounded-full overflow-hidden flex items-center justify-center shadow-md transition-opacity"
            style={{
                background: foto ? "transparent" : "#ddeef7",
                border: "3px solid #f0c030",
            }}
            >
            {foto ? (
                <img src={foto} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
                <svg width="58" height="58" fill="none" viewBox="0 0 24 24">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="#c5d8e8" />
                <circle cx="12" cy="13" r="4" stroke="#9ca3af" strokeWidth="1.5" fill="#ddeef7" />
                </svg>
            )}
            </div>
            <div
            className="absolute bottom-0 right-0 rounded-full flex items-center justify-center shadow border-2 border-white"
            style={{ width: 32, height: 32, background: "#f5c518" }}
            >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2" />
            </svg>
            </div>
        </label>

        <div className="flex flex-col gap-3 w-full">
            <InputField placeholder="Nombre" value={nombre} onChange={setNombre} icon={<UserIcon />} />
            <InputField placeholder="Apellido" value={apellido} onChange={setApellido} icon={<UserIcon />} />
            <InputField placeholder="Nombre de usuario" value={username} onChange={setUsername} icon={<UserIcon />} />
            <InputField type="email" placeholder="Correo electrónico" value={email} onChange={setEmail} icon={<EmailIcon />} />
            <InputField type="tel" placeholder="Teléfono (8 dígitos)" value={telefono} onChange={setTelefono} icon={<PhoneIcon />} />
            <InputField type="password" placeholder="Contraseña" value={password} onChange={setPassword} icon={<LockIcon />} />
            <InputField type="password" placeholder="Confirmar contraseña" value={confirmar} onChange={setConfirmar} icon={<LockIcon />} />
        </div>

        <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-white text-base shadow-md mt-4 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg,#f5c518 0%,#e6a800 100%)" }}
        >
            {loading ? <Spinner /> : "Registrarse"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-2">
            ¿Ya tienes cuenta?{" "}
            <button onClick={() => onNavigate("login")} className="font-semibold" style={{ color: "#2196F3" }}>
            Ingresa
            </button>
        </p>
        </>
    );
}