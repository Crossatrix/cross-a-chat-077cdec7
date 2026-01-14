import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NotificationToggleProps {
  userId: string | null;
}

export const NotificationToggle = ({ userId }: NotificationToggleProps) => {
  const { isSupported, isEnabled, isLoading, enableNotifications, disableNotifications } = usePushNotifications(userId);
  const { t } = useLanguage();

  const handleToggle = async () => {
    if (isEnabled) {
      await disableNotifications();
      toast.success(t('notifications.disabled'));
    } else {
      const success = await enableNotifications();
      if (success) {
        toast.success(t('notifications.enabled'));
      } else {
        toast.error(t('notifications.failed'));
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={isLoading}
            className="relative"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEnabled ? (
              <>
                <Bell className="h-4 w-4 text-primary" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green-500" />
              </>
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isEnabled 
              ? t('notifications.clickToDisable') 
              : t('notifications.clickToEnable')}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
