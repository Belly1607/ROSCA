import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

function Member() {

    const [members, setMembers] = useState([]);

    useEffect(() => {
        fetch("http://localhost:5000/members")
            .then((res) => res.json())
            .then((data) => setMembers(data))
            .catch((err) => console.error(err));
    }, []);

    return (
        <div className="member-page">

            <div className="member-header">
                <h1>Church Members</h1>
                <p>
                    Manage registered welfare members.
                </p>
            </div>

            <div className="member-actions">
                <Link to="/memberform">
                    <button className="add-member-btn">
                        + Add New Member
                    </button>
                </Link>
            </div>

            <div className="member-table-card">
                <h2>Registered Members</h2>

                <table className="member-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Gender</th>
                            <th>Date Joined</th>
                        </tr>
                    </thead>

                    <tbody>

                        {members.length === 0 ? (
                            <tr>
                                <td colSpan="6">
                                    No members found
                                </td>
                            </tr>
                        ) : (
                            members.map((member) => (
                                <tr key={member.id}>
                                    <td>{member.id}</td>
                                    <td>{member.membername}</td>
                                    <td>{member.contact}</td>
                                    <td>{member.email}</td>
                                    <td>{member.gender}</td>
                                    <td>
                                        {new Date(
                                            member.date_joined
                                        ).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}

                    </tbody>
                </table>

            </div>

        </div>
    );
}

export default Member;