// hyperNova – CardList sidebar
import { useHyperNovaStore, selectCurrentCard } from '../shared/store';

const S = {
  sidebar: {
    width: 170,
    minWidth: 170,
    background: '#111120',
    borderRight: '1px solid #2a2a4a',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    overflow: 'hidden',
    userSelect: 'none' as const,
  },
  header: {
    padding: '8px 10px 4px',
    fontSize: 11,
    fontWeight: 700,
    color: '#7070a0',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid #1e1e36',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '4px 0',
  },
  cardItem: (selected: boolean) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    padding: '5px 10px',
    cursor: 'pointer',
    background: selected ? '#2a2a5a' : 'transparent',
    color: selected ? '#c0c0ff' : '#a0a0c0',
    fontSize: 13,
    borderLeft: selected ? '3px solid #5555ff' : '3px solid transparent',
    gap: 6,
  }),
  cardNum: {
    fontSize: 10,
    color: '#5555aa',
    minWidth: 16,
    textAlign: 'right' as const,
  },
  cardTitle: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  actions: {
    borderTop: '1px solid #1e1e36',
    padding: '6px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 4,
  },
  btn: (danger = false) => ({
    padding: '4px 8px',
    fontSize: 11,
    background: danger ? '#3a1a1a' : '#1e1e3a',
    color: danger ? '#ff8888' : '#a0a0ff',
    border: `1px solid ${danger ? '#5a2a2a' : '#2a2a5a'}`,
    borderRadius: 4,
    cursor: 'pointer',
    textAlign: 'center' as const,
  }),
};

export function CardList() {
  const store = useHyperNovaStore();
  const currentCard = useHyperNovaStore(selectCurrentCard);
  const stack = store.project.stacks[store.selectedStackIndex];

  if (!stack) return null;

  return (
    <div style={S.sidebar}>
      <div style={S.header}>📚 {store.project.stacks.length > 1 ? stack.title : 'Cards'}</div>

      <div style={S.list}>
        {stack.cards.map((card, idx) => (
          <div
            key={card.id}
            style={S.cardItem(card.id === store.selectedCardId)}
            onClick={() => store.selectCard(card.id)}
          >
            <span style={S.cardNum}>{idx + 1}</span>
            <span style={S.cardTitle}>{card.title}</span>
          </div>
        ))}
      </div>

      <div style={S.actions}>
        <div style={S.btn()} onClick={() => store.addCard()}>+ Add Card</div>
        {currentCard && (
          <>
            <div
              style={S.btn()}
              onClick={() => store.duplicateCard(store.selectedCardId)}
            >
              ⧉ Duplicate
            </div>
            <div
              style={S.btn(true)}
              onClick={() => {
                if (stack.cards.length <= 1) return;
                if (confirm(`Delete "${currentCard.title}"?`)) {
                  store.deleteCard(store.selectedCardId);
                }
              }}
            >
              ✕ Delete
            </div>
          </>
        )}
      </div>
    </div>
  );
}
