import { type PropsWithChildren, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {X} from "@phosphor-icons/react";
import { useDrag } from "@use-gesture/react";
import { AnimatePresence, motion } from "motion/react";
import { useKeyboard, useKeyboardInsets } from "./Keyboard";
import { useScreenPortal } from "./PhoneFrame";
import { useMobileDevice } from "./Device";

type BottomSheetProps = PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  snap?: number;
  onRestoreFocus?:()=>void;
}>;

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  snap = 0.72,
  onRestoreFocus,
  children,
}: BottomSheetProps) {
  const { device } = useMobileDevice();
  const { screenRef } = useScreenPortal();
  const keyboard = useKeyboard();
  const { keyboardHeight } = useKeyboardInsets();
  const [dragY, setDragY] = useState(0);
  const [webDesktop,setWebDesktop]=useState(false);
  useEffect(()=>{const query=window.matchMedia('(min-width:761px)');const sync=()=>setWebDesktop(Boolean(document.querySelector('.desktop-chrome'))&&query.matches);sync();query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync);},[]);

  useEffect(() => {
    if (open) keyboard.hide();
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      keyboard.hide();
    }

    onOpenChange(nextOpen);
  };

  const bindDrag = useDrag(
    (state) => {
      const [, movementY] = state.movement;
      const [, velocityY] = state.velocity;
      const [, directionY] = state.direction;
      const nextY = Math.max(0, movementY);

      if (!state.last) {
        setDragY(nextY);
        return;
      }

      const shouldClose = nextY > 96 || (velocityY > 0.55 && directionY > 0);
      setDragY(0);

      if (shouldClose) {
        onOpenChange(false);
      }
    },
    {
      axis: "y",
      filterTaps: true,
    },
  );

  const sheetHeight = Math.round(device.geometry.screen.height * snap);
  const effectiveHeight = Math.max(260, sheetHeight - Math.min(keyboardHeight, 180));
  const sheetBottom =
    device.platform === "android"
      ? Math.max(device.geometry.safeArea.bottom, keyboardHeight)
      : keyboardHeight;
  const portalContainer = screenRef.current ?? undefined;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {/* Keep the portal mounted after `open` flips so AnimatePresence can run
          the sheet and overlay exit animations before Radix removes them. */}
      <Dialog.Portal container={portalContainer} forceMount>
        <AnimatePresence>
          {open ? (
            <>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="sheet-overlay"
                  data-testid="sheet-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount onCloseAutoFocus={onRestoreFocus?event=>{event.preventDefault();onRestoreFocus();}:undefined}>
                <motion.div
                  className="bottom-sheet"
                  data-testid="bottom-sheet"
                  style={{
                    bottom: sheetBottom,
                    maxHeight: effectiveHeight,
                  }}
                  initial={webDesktop?{opacity:0}:{y:effectiveHeight+36}}
                  animate={webDesktop?{opacity:1}:{y:dragY}}
                  exit={webDesktop?{opacity:0,transition:{duration:0.12}}:{
                    y: effectiveHeight + 36,
                    transition: {
                      type: "spring",
                      stiffness: 250,
                      damping: 30,
                      mass: 1.05,
                    },
                  }}
                  transition={webDesktop?{duration:0.12}:{type:"spring",stiffness:500,damping:43,mass:0.9}}
                >
                  <div className="sheet-handle-zone" data-testid="sheet-handle" {...bindDrag()}>
                    <div className="sheet-handle" />
                  </div>
                  <div className="sheet-header">
                    <Dialog.Title className="sheet-title">{title}</Dialog.Title>
                    <Dialog.Close asChild><button className="web-sheet-close" aria-label="Close dialog"><X size={22}/></button></Dialog.Close>
                    {description ? <Dialog.Description className="sheet-description">{description}</Dialog.Description> : null}
                  </div>
                  <div className="sheet-content">{children}</div>
                </motion.div>
              </Dialog.Content>
            </>
          ) : null}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
