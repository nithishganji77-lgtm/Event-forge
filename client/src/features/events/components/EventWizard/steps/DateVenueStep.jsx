import { useFormContext } from 'react-hook-form';
import { FormField } from '../../../../../components/ui/FormField.jsx';

export function DateVenueStep() {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <p className="text-meta text-(--color-text)/50 mb-4">Date</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Start date" type="date" register={register('startDate')} error={errors.startDate?.message} />
          <FormField label="End date" type="date" register={register('endDate')} error={errors.endDate?.message} />
          <FormField label="Start time" type="time" register={register('startTime')} error={errors.startTime?.message} />
          <FormField label="End time" type="time" register={register('endTime')} error={errors.endTime?.message} />
        </div>
        <div className="mt-4">
          <FormField label="Timezone" register={register('timezone')} error={errors.timezone?.message} />
        </div>
      </div>

      <div>
        <p className="text-meta text-(--color-text)/50 mb-4">Venue</p>
        <div className="space-y-4">
          <FormField label="Venue name" register={register('venue.name')} error={errors.venue?.name?.message} />
          <FormField label="Address" register={register('venue.address')} error={errors.venue?.address?.message} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Room" register={register('venue.room')} error={errors.venue?.room?.message} />
            <FormField label="Map link" register={register('venue.mapUrl')} error={errors.venue?.mapUrl?.message} />
          </div>
        </div>
      </div>
    </div>
  );
}
