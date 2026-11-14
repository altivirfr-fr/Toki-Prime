import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, UserCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExecutiveTask, AuraColor } from '../types';
import { getTheme } from '../utils/theme';
import { getLocalDateString } from '../utils/dateUtils';

interface TaskPriorityListProps {
  tasks: ExecutiveTask[];
  auraColor?: AuraColor;
  onToggleTask: (id: string) => void;
  onAddTask: (task: ExecutiveTask) => void;
  onDeleteTask: (id: string) => void;
}

export const TaskPriorityList: React.FC<TaskPriorityListProps> = ({
  tasks,
  auraColor,
  onToggleTask,
  onAddTask,
  onDeleteTask,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('high');
  const currentTheme = getTheme(auraColor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: ExecutiveTask = {
      id: 'task-' + Date.now(),
      title: newTitle.trim(),
      priority: newPriority,
      completed: false,
      dueDate: getLocalDateString(0),
    };

    onAddTask(newTask);
    setNewTitle('');
  };

  const handleToggle = (id: string, currentCompleted: boolean) => {
    onToggleTask(id);
    if (!currentCompleted) {
      try {
        confetti({
          particleCount: 20,
          spread: 40,
          origin: { y: 0.8 },
        });
      } catch (e) {}
    }
  };

  const getPriorityLabel = (priority: string) => {
    if (priority === 'high') return { text: 'Alta', color: 'text-rose-400' };
    if (priority === 'medium') return { text: 'Média', color: 'text-amber-400' };
    return { text: 'Baixa', color: 'text-sky-400' };
  };

  return (
    <div className="bg-[#1e1e21] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Tarefas & Decisões</h3>
          <p className="text-xs text-zinc-400 tabular-nums">
            {tasks.filter((t) => t.completed).length} de {tasks.length} concluídas
          </p>
        </div>
      </div>

      {/* Add Task input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nova tarefa..."
          className="flex-1 bg-[#141416] border border-white/[0.08] rounded-xl px-3 h-10 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:border-white/[0.2] outline-none transition-colors"
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
          className="bg-[#141416] border border-white/[0.08] rounded-xl px-2.5 h-10 text-xs text-zinc-300 outline-none"
        >
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className={`w-10 h-10 rounded-xl ${currentTheme.primaryBtn} flex items-center justify-center disabled:opacity-40 transition-colors shrink-0`}
          title="Adicionar tarefa"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      {/* Task list */}
      <div className="divide-y divide-white/[0.06]">
        {tasks.map((task) => {
          const pri = getPriorityLabel(task.priority);
          return (
            <div
              key={task.id}
              className={`py-2.5 flex items-center justify-between gap-3 ${
                task.completed ? 'opacity-55' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => handleToggle(task.id, task.completed)}
                  className="text-zinc-400 hover:text-emerald-400 transition-colors shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>

                <div className="min-w-0">
                  <p
                    className={`text-xs sm:text-sm font-medium ${
                      task.completed ? 'line-through text-zinc-500' : 'text-zinc-200'
                    } truncate`}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] mt-0.5">
                    <span className={pri.color}>{pri.text}</span>
                    {task.delegatedTo && (
                      <span className="text-zinc-500 flex items-center gap-1">
                        <span>·</span>
                        <UserCheck className="w-3 h-3" />
                        {task.delegatedTo}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors shrink-0"
                title="Excluir tarefa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
