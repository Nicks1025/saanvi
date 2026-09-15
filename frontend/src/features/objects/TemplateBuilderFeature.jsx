import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import TemplateBuilder from './TemplateBuilder';
import * as objectsService from './objectsService';

const TemplateBuilderFeature = () => {
  const { uuid, template_uuid } = useParams();
  const navigate = useRouter();

  const [template, setTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [uuid, template_uuid]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const templatesRes = await objectsService.getTemplates(uuid);
      const allTemplates = Array.isArray(templatesRes) ? templatesRes : (templatesRes.data || []);
      const currentTemplate = allTemplates.find(t => t.uuid === template_uuid);
      
      if (!currentTemplate) throw new Error('Template not found');
      setTemplate(currentTemplate);

      const fieldsRes = await objectsService.getFields(uuid);
      setFields(Array.isArray(fieldsRes) ? fieldsRes : (fieldsRes.data || []));
    } catch (err) {
      toast.error(err.message || 'Failed to load template data');
      navigate.push(`/objects/${uuid}?tab=templates`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading template builder...</div>;
  }

  if (!template) return null;

  return (
    <div className="page-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TemplateBuilder
        template={template}
        formFields={fields}
        onSave={async (layoutFields) => {
          try {
            await objectsService.updateTemplate(uuid, template.uuid, { fields: layoutFields });
            toast.success('Template layout saved successfully');
            navigate.push(`/objects/${uuid}?tab=templates`);
          } catch (err) {
            toast.error('Failed to save layout');
          }
        }}
        onCancel={() => navigate.push(`/objects/${uuid}?tab=templates`)}
      />
    </div>
  );
};

export default TemplateBuilderFeature;
