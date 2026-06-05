import { useState } from "react";

function MemberForm() {

    const [newmember, setnewmember] = useState("");
    const [contact, setcontact] = useState("");
    const [email, setemail] = useState("");
    const [gender, setgender] = useState("");

    return (
        <div className="member-form-container">

            <div className="member-form-header">
                <h1>Add New Member</h1>
                <p>
                    Register a new church welfare member.
                </p>
            </div>

            <form className="member-form">

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
                        placeholder="Enter email"
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