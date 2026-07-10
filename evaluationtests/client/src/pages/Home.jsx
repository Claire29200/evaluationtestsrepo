import CDList from "../components/CDList";
import AddCD from "../components/AddCD";

const Home = () => {
  return (
    <div>
      <h1>🎶 Gestion des CD 🎶</h1>
      <AddCD onAdd={() => window.location.reload()} />
      <CDList />
    </div>
  );
};

export default Home;