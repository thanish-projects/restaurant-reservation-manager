import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * LineBreaksPipe
 * Converts \n newlines to <br> tags for display in innerHTML.
 * Used by the AI chat widget to render multi-line responses.
 */
@Pipe({
  name: 'lineBreaks',
  standalone: true,
})
export class LineBreaksPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | undefined | null): SafeHtml {
    if (!value) return '';
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(escaped);
  }
}
