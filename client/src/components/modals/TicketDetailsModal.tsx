"use client";

import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const TicketDetailsModal = ({
  isTicketModalOpen,
  setIsTicketModalOpen,
}: {
  isTicketModalOpen: boolean;
  setIsTicketModalOpen: (open: boolean) => void;
}) => {
  return (
    <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
      <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden gap-0 bg-black border border-white/20 shadow-xl shadow-white/10">
        
        {/* Header Section */}
        <div className="p-8 pb-6 relative">

          
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-white">TCK-10001</h3>
            <p className="text-sm text-c-slate-400">Payment processing issue</p>
          </div>

          <div className="flex gap-2 mt-4">
            <Badge className="bg-c-cyan-900/30 text-c-cyan-400 hover:bg-c-cyan-900/40 border-none px-4 py-1 rounded-full text-xs font-medium shadow-none">
              Billing
            </Badge>
            <Badge className="bg-c-orange-900/30 text-c-orange-400 hover:bg-c-orange-900/40 border-c-orange-800/50 px-4 py-1 rounded-full text-xs font-medium shadow-none border">
              In Progress
            </Badge>
          </div>
        </div>

        {/* Chat Body Section */}
        {/* Removed bg-white so it adopts the modal's dark background */}
        <div className="px-8 py-4 h-[370px] sm:h-[420px] lg:h-[450px] overflow-y-auto space-y-6 flex flex-col">
          
          {/* User Message */}
          <div className="self-end max-w-[70%] space-y-2">
            <div className="bg-green text-white p-4 rounded-2xl rounded-tr-none text-sm leading-relaxed">
              I&apos;m unable to process my payment. The system keeps showing an error message.
            </div>
            <p className="text-[11px] text-c-slate-500 text-right mr-1">1 min ago</p>
          </div>

          {/* Agent Message */}
          <div className="self-start max-w-[70%] space-y-2">
            <div className="bg-c-slate-800 text-c-slate-300 p-5 rounded-2xl rounded-tl-none space-y-3">
              <p className="font-bold text-c-slate-200 text-sm">Support Agent</p>
              <p className="text-sm leading-relaxed text-c-slate-300">
                Thank you for reaching out! I&apos;ve reviewed your account. Can you please provide the error message you&apos;re seeing?
              </p>
            </div>
            <p className="text-[11px] text-c-slate-500 ml-1">1 hour ago</p>
          </div>

          {/* User Message 2 */}
          <div className="self-end max-w-[70%] space-y-2">
            <div className="bg-green text-white p-4 rounded-2xl rounded-tr-none text-sm leading-relaxed">
              Sure! The error says: &apos;Transaction declined - Please verify your payment method&apos;
            </div>
            <p className="text-[11px] text-c-slate-500 text-right mr-1">1 min ago</p>
          </div>
        </div>

        {/* Footer / Input Section */}
        <div className="p-8 pt-4 pb-10 flex gap-3 items-center">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-c-slate-500 cursor-pointer hover:text-c-slate-300">
              <Paperclip className="w-5 h-5 rotate-45" />
            </div>
            <Input 
              placeholder="Type your message..." 
              className="h-12 pl-12 pr-4 border-c-slate-800 bg-transparent rounded-lg focus-visible:ring-c-purple text-sm text-c-slate-200 placeholder:text-c-slate-500"
            />
          </div>
          <Button 
            className="h-12 px-8 "
          >
            Send
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailsModal;