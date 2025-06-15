import React, { useEffect, useState } from 'react';
import axios from '../api/axiosConfig';

// Define the type for a resource object
interface Resource {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  category: {
    name: string;
  };
}

// Define the type for resources grouped by category
interface GroupedResources {
  [categoryName: string]: Resource[];
}

const ResourcesView = () => {
  const [groupedResources, setGroupedResources] = useState<GroupedResources>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const { data } = await axios.get<Resource[]>('/api/resources');
        
        // Group the resources by category name
        const groups = data.reduce((acc, resource) => {
          const category = resource.category.name;
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(resource);
          return acc;
        }, {} as GroupedResources);
        
        setGroupedResources(groups);

      } catch (error) {
        console.error('Failed to fetch resources', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, []);

  if (loading) return <p>Loading resources...</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Resources</h1>
      <div className="space-y-8">
        {Object.keys(groupedResources).length > 0 ? (
          Object.entries(groupedResources).map(([category, resources]) => (
            <div key={category}>
              <h2 className="text-2xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">
                {category}
              </h2>
              <ul className="space-y-3">
                {resources.map((resource) => (
                  <li key={resource.id} className="p-4 bg-white rounded-lg shadow flex items-center justify-between">
                    <div>
                      <p className="text-lg font-medium text-gray-800">{resource.title}</p>
                      {resource.description && (
                        <p className="text-sm text-gray-500">{resource.description}</p>
                      )}
                    </div>
                    <a
                      href={resource.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 mt-10">No resources have been added yet.</p>
        )}
      </div>
    </div>
  );
};

export default ResourcesView;