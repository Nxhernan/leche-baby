export default function BigButton({ onPress }) {
  return (
    <div className="big-button-container">
      <button className="big-button" onClick={onPress}>
        <span className="icon">🍼</span>
        <span>Registrar<br/>Leche</span>
      </button>
    </div>
  )
}
