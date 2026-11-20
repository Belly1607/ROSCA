
import { useEffect, useState } from "react";
import { UserRound, Mail, Phone, ShieldCheck, Save } from "lucide-react";
import { apiRequest } from "../utils/api";
import "../page_css/Account.css";

export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await apiRequest("/profile");

                setProfile(data);
                setName(data.full_name || "");
                setPhone(data.phone || "");
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    async function saveProfile(e) {
        e.preventDefault();
        setMessage("");
        setError("");
        setSaving(true);

        try {
            const data = await apiRequest("/profile", {
                method: "PATCH",
                body: JSON.stringify({
                    full_name: name.trim(),
                    phone: phone.trim()
                })
            });

            setMessage(data.message);

            setProfile((old) => ({
                ...old,
                full_name: name.trim(),
                phone: phone.trim()
            }));
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="account-page">Loading profile...</div>;
    }

    if (!profile) {
        return (
            <div className="account-page">
                <p className="account-error">
                    {error || "Unable to load profile"}
                </p>
            </div>
        );
    }

    return (
        <div className="account-page">
            <div className="account-page-heading">
                <span className="account-eyebrow">
                    MY ACCOUNT
                </span>
                <h1>My Profile</h1>
                <p>View and update your personal information.</p>
            </div>

            <div className="account-profile-banner">
                <div className="account-large-avatar">
                    {profile.full_name.charAt(0).toUpperCase()}
                </div>

                <div>
                    <h2>{profile.full_name}</h2>
                    <p>{profile.email}</p>
                    <span className="account-role">
                        <ShieldCheck size={14} />
                        {profile.role === "admin"
                            ? "Administrator"
                            : "ROSCA Member"}
                    </span>
                </div>
            </div>

            <div className="account-card">
                <div className="account-card-heading">
                    <UserRound size={20} />
                    <h2>Personal Information</h2>
                </div>

                <form onSubmit={saveProfile}>
                    <div className="account-form-group">
                        <label htmlFor="profile-name">
                            Full Name
                        </label>
                        <input
                            id="profile-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={100}
                            required
                        />
                    </div>

                    <div className="account-form-group">
                        <label htmlFor="profile-email">
                            <Mail size={15} /> Email Address
                        </label>
                        <input
                            id="profile-email"
                            value={profile.email}
                            disabled
                        />
                        <small>
                            Email changes are not enabled yet.
                        </small>
                    </div>

                    <div className="account-form-group">
                        <label htmlFor="profile-phone">
                            <Phone size={15} /> Phone Number
                        </label>
                        <input
                            id="profile-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            maxLength={30}
                            placeholder="Enter your phone number"
                        />
                    </div>

                    <div className="account-details-grid">
                        <div>
                            <span>Account Role</span>
                            <strong>{profile.role}</strong>
                        </div>

                        <div>
                            <span>Account Status</span>
                            <strong>{profile.status}</strong>
                        </div>

                        <div>
                            <span>Member ID</span>
                            <strong>#{profile.user_id}</strong>
                        </div>
                    </div>

                    {error && (
                        <p className="account-error" role="alert">
                            {error}
                        </p>
                    )}

                    {message && (
                        <p className="account-success" role="status">
                            {message}
                        </p>
                    )}

                    <button
                        className="account-primary-button"
                        type="submit"
                        disabled={saving}
                    >
                        <Save size={17} />
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </form>
            </div>
        </div>
    );
}
