
import { useState } from "react";

function MemberForm() {
    const [newmember, setnewmember] = useState("");
    const [contact, setcontact] = useState("");
    const [email, setemail] = useState("");
    const [gender, setgender] = useState("");

    const [error, seterror] = useState("");
    const [success, setsuccess] = useState("");

    const addMember = async (e) => {
        e.preventDefault();

        if (
            newmember.trim() === "" ||
            contact.trim() === "" ||
            email.trim() === "" ||
            gender.trim() === ""
        ) {
            seterror("All fields are required");
            setsuccess("");
            return;
        }

        try {
            const response = await fetch(
                "http://localhost:5000/members",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: newmember,
                        contact,
                        email,
                        gender
                    })
                }
            );

            if (!response.ok) {
                throw new Error("Failed to add member");
            }

            setnewmember("");
            setcontact("");
            setemail("");
            setgender("");

            setsuccess("Member registered successfully");
            seterror("");
        } catch (err) {
            seterror("Failed to register member");
            setsuccess("");
        }
    };

    return (
        <div className="member-form-container">

            <div className="member-form-header">
                <h1>Add New Member</h1>
                <p>
                    Register a new church welfare member.
                </p>
            </div>

            <form
                className="member-form"
                onSubmit={addMember}
            >

                <div className="form-group">
                    <label>Full Name</label>

                    <input
                        type="text"
                        placeholder="Enter member name"
                        value={newmember}
                        onChange={(e) =>
                            setnewmember(e.target.value)
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Phone Number</label>

                    <input
                        type="text"
                        placeholder="Enter phone number"
                        value={contact}
                        onChange={(e) =>
                            setcontact(e.target.value)
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Email Address</label>

                    <input
                        type="email"
                        placeholder="Enter email address"
                        value={email}
                        onChange={(e) =>
                            setemail(e.target.value)
                        }
                    />
                </div>

                <div className="form-group">
                    <label>Gender</label>

                    <select
                        value={gender}
                        onChange={(e) =>
                            setgender(e.target.value)
                        }
                    >
                        <option value="">
                            Select Gender
                        </option>

                        <option value="Male">
                            Male
                        </option>

                        <option value="Female">
                            Female
                        </option>
                    </select>
                </div>

                {error && (
                    <p className="error-message">
                        {error}
                    </p>
                )}

                {success && (
                    <p className="success-message">
                        {success}
                    </p>
                )}

                <button
                    type="submit"
                    className="submit-btn"
                >
                    Register Member
                </button>

            </form>

        </div>
    );
}

export default MemberForm;

