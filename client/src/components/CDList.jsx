import { useEffect, useState } from "react";
import { getCDs, deleteCD } from "../services/cdService";
import CDItem from "./CDItem";

const CDList = () => {
  const [cds, setCDs] = useState([]);

  useEffect(() => {
    fetchCDs();
  }, []);

  const fetchCDs = async () => {
    const data = await getCDs();
    setCDs(data);
  };

  const handleDelete = async (id) => {
    await deleteCD(id);
    fetchCDs(); // Rafraîchir la liste après suppression
  };

  return (
    <div className="container">
      <h2>Liste des CD 🎵</h2>
      <ul>
        {cds.length > 0 ? (
          cds.map((cd) => <CDItem key={cd.id} cd={cd} onDelete={handleDelete} />)
        ) : (
          <p>Aucun CD disponible</p>
        )}
      </ul>
    </div>
  );
};

export default CDList