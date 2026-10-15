import { View } from 'react-native';
import { Typography, Button } from '../atoms';
import { Icon, IconName } from '../atoms/Icon';

type Props = {
  icon?: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function EmptyState({ icon = 'Leaf', title, description, actionLabel, onAction, secondaryLabel, onSecondary }: Props) {
  return (
    <View className="items-center rounded-[28px] border border-border-default bg-ground-surface px-6 py-9 my-3">
      <View className="w-24 h-24 rounded-full bg-brand-50 dark:bg-brand-500/10 items-center justify-center mb-5">
        <View className="w-16 h-16 rounded-[22px] bg-ground-surface border border-brand-500/20 items-center justify-center">
          <Icon name={icon} size={30} color="#10B981" strokeWidth={1.7} />
        </View>
        <View className="absolute right-0 top-1 w-7 h-7 rounded-full bg-brand-500 items-center justify-center">
          <Icon name="Sparkles" size={14} color="#FFFFFF" />
        </View>
      </View>
      <Typography variant="h2" className="text-center mb-2">{title}</Typography>
      <Typography color="muted" className="text-center max-w-[300px] mb-5">{description}</Typography>
      {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} className="w-full max-w-[280px]" />}
      {secondaryLabel && onSecondary && <Button label={secondaryLabel} onPress={onSecondary} variant="ghost" className="mt-2" />}
    </View>
  );
}
