import messages from '@/messages.json';

export function getMessage(key: keyof typeof messages, ...args: string[]): string {
  let message = messages[key];
  args.forEach((arg, index) => {
    message = message.replace(`{${index}}`, arg);
  });
  return message;
}
