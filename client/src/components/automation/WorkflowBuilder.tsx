import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type NodeType = 'send_email' | 'delay' | 'if_condition';

interface Node {
  id: string;
  type: NodeType;
  properties: any;
}

export function WorkflowBuilder() {
  const [nodes, setNodes] = useState<Node[]>([]);

  const addNode = (type: NodeType) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type,
      properties:
        type === 'delay'
          ? { days: 1 }
          : type === 'if_condition'
            ? { condition: 'opened_email', value: '' }
            : { templateId: '' },
    };
    setNodes(currentNodes => [...currentNodes, newNode]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visual Workflow Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              <Card className='p-4'>
                {/* Node-specific configuration would go here */}
                <p>
                  {node.type.replace('_', ' ')}:{' '}
                  {JSON.stringify(node.properties)}
                </p>
              </Card>
              {index < nodes.length && (
                <div className='flex justify-center'>
                  <ArrowDown className='h-6 w-6 text-gray-400' />
                </div>
              )}
            </React.Fragment>
          ))}
          <Select onValueChange={addNode}>
            <SelectTrigger>
              <SelectValue placeholder='Add new step...' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='send_email'>Send Email</SelectItem>
              <SelectItem value='delay'>Delay</SelectItem>
              <SelectItem value='if_condition'>If/Else Condition</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className='mt-6'>Save Workflow</Button>
      </CardContent>
    </Card>
  );
}
