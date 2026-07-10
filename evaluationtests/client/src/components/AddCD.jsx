import { useState } from "react";
import { addCD } from "../services/cdService";

const AddCD = ({ onAdd }) => {
  const [form, setForm] = useState({ title: "", artist: "", year: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.artist || !form.year) return;

    await addCD(form);
    onAdd();
    setForm({ title: "", artist: "", year: "" });
  };

  return (
    <div className="container">
      <h2>Ajouter un CD ➕</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="title" placeholder="Titre du CD" value={form.title} onChange={handleChange} required />
        <input type="text" name="artist" placeholder="Artiste" value={form.artist} onChange={handleChange} required />
        <input type="number" name="year" placeholder="Année" value={form.year} onChange={handleChange} required />
        <button type="submit">Ajouter</button>
      </form>
    </div>
  );
};

export default AddCD