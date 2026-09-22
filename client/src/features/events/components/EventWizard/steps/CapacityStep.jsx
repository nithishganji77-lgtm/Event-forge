import { useFormContext } from 'react-hook-form';
import { FormField } from '../../../../../components/ui/FormField.jsx';

export function CapacityStep() {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-5 max-w-xl">
      <FormField
        label="Maximum attendees"
        type="number"
        min={1}
        register={register('capacity')}
        error={errors.capacity?.message}
      />
      <FormField
        label="Registration deadline (optional)"
        type="date"
        register={register('registrationDeadline')}
        error={errors.registrationDeadline?.message}
      />
      <p className="text-sm text-(--color-text)/50">
        Once capacity is reached, new registrants are automatically placed on a waitlist.
      </p>
    </div>
  );
}
