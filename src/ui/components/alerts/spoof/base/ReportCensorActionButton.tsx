import ElementWrap from "@/ui/components/ElementWrap";
import { ActionButton } from "../../alerts";
import { report } from "@/api/reports-api";
import { SpoofableType } from "@/types";
import { localSource } from "@/api/db-api";
import { sources } from "@/api/main-api";
import { hasSpoof } from "@/utils/music";

export class ReportCensorActionButton extends ElementWrap<HTMLButtonElement> {
    public constructor(private readonly reportData: { id: string, type: SpoofableType }) { 
        super() 

        const { id, type } = reportData;
        this.disabled = localSource.isReported(Number(id), type) || hasSpoof(sources, type, id);
    }

    private busy = false;
    private disabled = false;

    protected createElement() {
        return <ActionButton {...(this.disabled || this.busy ? { disabled: true } : {})} onclick={this.onReport.bind(this)}>Сообщить о цензуре</ActionButton>; 
    }

    private onReport() {
        if (this.disabled || this.busy) return;

        this.busy = true;
        this.element.setAttribute("disabled", "true");
        
        const { id, type } = this.reportData;
        report(id, type, false).then((success) => {
            this.busy = false;

            this.disabled = success;
            this.element.toggleAttribute("disabled", this.disabled);
        })
    }
}