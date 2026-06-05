import { Link } from "react-router-dom";

function Member() {
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
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Gender</th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr>
                            <td>John Doe</td>
                            <td>0712345678</td>
                            <td>john@email.com</td>
                            <td>Male</td>
                        </tr>

                        <tr>
                            <td>Sarah Doe</td>
                            <td>0771234567</td>
                            <td>sarah@email.com</td>
                            <td>Female</td>
                        </tr>
                    </tbody>
                </table>

            </div>

        </div>
    );
}

export default Member;