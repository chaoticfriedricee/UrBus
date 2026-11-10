import { FilterChips } from '../../../shared/ui/index.js';

export const GroupFilter = ({ groups, selectedGroupId, onSelect, disabled }) => {
  const options = [
    { value: null, label: 'Todos' },
    ...groups.map((group) => ({
      value: group._id,
      label: group.name,
      count: group.isActive ? (group.passengerCount ?? 0) : 'inactivo',
    })),
  ];

  return (
    <FilterChips
      label="Grupo de pasajeros"
      options={options}
      value={selectedGroupId}
      onChange={onSelect}
      disabled={disabled}
    />
  );
};
