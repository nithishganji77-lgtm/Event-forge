import { useFormContext } from 'react-hook-form';
import { FormField } from '../../../../../components/ui/FormField.jsx';
import { Label } from '../../../../../components/ui/Label.jsx';
import { Textarea } from '../../../../../components/ui/Textarea.jsx';
import { Select } from '../../../../../components/ui/Select.jsx';
import { CoverImageUpload } from '../../CoverImageUpload.jsx';
import { EVENT_CATEGORIES } from '../../../schemas/event.schema.js';

export function BasicInfoStep({ eventId, coverImageUrl, onCoverImageFileSelected }) {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-5 max-w-xl">
      <FormField label="Event name" register={register('title')} error={errors.title?.message} />

      <FormField
        as={Textarea}
        label="Description"
        register={register('description')}
        error={errors.description?.message}
      />

      <FormField
        as={Select}
        label="Category"
        register={register('category')}
        error={errors.category?.message}
      >
        {EVENT_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </FormField>

      <div>
        <Label>Cover image</Label>
        <CoverImageUpload
          eventId={eventId}
          currentUrl={coverImageUrl}
          onFileSelected={onCoverImageFileSelected}
        />
      </div>
    </div>
  );
}
