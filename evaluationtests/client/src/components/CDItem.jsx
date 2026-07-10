import PropTypes from "prop-types";

const CDItem = ({ cd, onDelete }) => {
  return (
    <li>
      <span>{cd.title} - {cd.artist} ({cd.year})</span>
      <button className="delete-btn" onClick={() => onDelete(cd.id)}>🗑 Supprimer</button>
    </li>
  );
};

CDItem.propTypes = {
  cd: PropTypes.object.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default CDItem