import type { mbfs } from "./atom.js";
const formatMs=(ms:number)=>`${String(Math.floor(ms / 3600000)).padStart(2, '0')} hours, ${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')} minutes`;
export const applications={
  neofetch:{
    name:"neofetch",
    type:"sh",
    data:`echo "         \\Red%%%%%\\End       \\Cyanadminstrator\\End@\\Cyanlocalhost\\End\\n";
echo "        \\Red% %%%%%\\End      ----------------------\\n";
echo "  \\Cyan%%%%%%\\End\\Red%% %%%%%\\End     \\CyanOS: \\EndBeansite Experimental Project 9.0\\n";
echo " \\Cyan%%%%% %%\\End\\Red%%%%%%%%\\End    \\CyanHost: \\EndWeb\\n";
echo "\\Cyan%%%%% %%\\End  \\Red%%%%%%%\\End    \\CyanKernal: \\End9.14-zen\\n";
echo "\\Cyan%%%%%%\\End    \\Red%%%%%%\\End     \\CyanUptime: \\End${formatMs(performance.now())}\\n";
echo "\\Cyan%%%%%%\\End \\Green%%%%\\End\\Red%%%%\\End      \\CyanPackages: \\End122 (beanman)\\n";
echo "  \\Cyan%%%\\End \\Green%   %%%%%%%\\End    \\CyanShell: \\EndMbsh 7.2\\n";
echo "      \\Green%    %%    %\\End   \\CyanDE: \\EndBeansite Test Gui\\n";
echo "      \\Green%%%       %\\End    \\CyanCPU: \\EndIntel Celeron N4020 (2) @ 2.800GHz\\n";
echo "        \\Green%%%%%%%%\\End     \\CyanMemory: \\End2058MiB / 3805MiB\\n";
echo "\\n";
echo "${" ".repeat(21)}";
echo "\\bgBrightGray   \\End";
echo "\\bgBlack   \\End";
echo "\\bgRed   \\End";
echo "\\bgOrange   \\End";
echo "\\bgYellow   \\End";
echo "\\bgGreen   \\End";
echo "\\bgCyan   \\End";
echo "\\bgBlue   \\End";
echo "\\bgMagenta   \\End";
echo "\\n";
echo "${" ".repeat(21)}";
echo "\\bgWhite   \\End";
echo "\\bgBrightBlack   \\End";
echo "\\bgBrightRed   \\End";
echo "\\bgBrightOrange   \\End";
echo "\\bgBrightYellow   \\End";
echo "\\bgBrightGreen   \\End";
echo "\\bgBrightCyan   \\End";
echo "\\bgBrightBlue   \\End";
echo "\\bgBrightMagenta   \\End";
echo "\\n\\n";`,
    metadata:{
      access:{
        read:{
          administrators:true,
          users:true,
          guests:false,
        },
        write:{
          administrators:true,
          users:false,
          guests:false,
        },
      },
      date:{
        created:new Date(),
        modified:new Date(),
        accessed:new Date(),
      },
      originalCreator:"root",
      typeof:{
        system:false,
        directory:false,
        executable:true,
      }
    },
  }, 
}satisfies Record<string,mbfs.File>;