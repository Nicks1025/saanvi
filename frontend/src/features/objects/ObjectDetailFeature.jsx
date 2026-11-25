import React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ObjectRecordsFeature from './ObjectRecordsFeature';
import ObjectFieldsFeature from './ObjectFieldsFeature';
import ObjectTemplatesFeature from './ObjectTemplatesFeature';

const ObjectDetailFeature = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const navigate = useRouter();

  const activeTab = searchParams?.get('tab') || 'records';

  const handleTabChange = (tabId) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabId);
    navigate.push(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      {activeTab === 'records' && (
        <ObjectRecordsFeature onTabChange={handleTabChange} />
      )}
      {activeTab === 'fields' && (
        <ObjectFieldsFeature onTabChange={handleTabChange} />
      )}
      {activeTab === 'templates' && (
        <ObjectTemplatesFeature onTabChange={handleTabChange} />
      )}
    </>
  );
};

export default ObjectDetailFeature;
