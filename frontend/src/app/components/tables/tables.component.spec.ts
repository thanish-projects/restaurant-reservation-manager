import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { TablesComponent } from './tables.component';
import { TableService } from '../../services/table.service';

describe('TablesComponent', () => {
  let fixture: ComponentFixture<TablesComponent>;
  let component: TablesComponent;
  let service: TableService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    service = TestBed.inject(TableService);
    spyOn(service, 'getAll').and.returnValue(
      of([{ id: 1, table_number: 1, capacity: 2, location: 'indoor', status: 'available' }])
    );

    fixture = TestBed.createComponent(TablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows tables returned by the API', () => {
    expect(component.tables.length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('passes filter values to the service', () => {
    component.filterLocation = 'outdoor';
    component.filterMinCapacity = '4';
    component.loadTables();
    expect(service.getAll).toHaveBeenCalledWith({ location: 'outdoor', status: '', minCapacity: '4' });
  });

  it('requires table number and capacity', () => {
    component.openAdd();
    expect(component.form.valid).toBeFalse();
    component.form.patchValue({ table_number: 5, capacity: 4 });
    expect(component.form.valid).toBeTrue();
  });

  it('calls update when editing an existing table', () => {
    const updateSpy = spyOn(service, 'update').and.returnValue(of({} as any));
    component.openEdit({ id: 7, table_number: 3, capacity: 4, location: 'indoor', status: 'available' });
    component.save();
    expect(updateSpy).toHaveBeenCalledWith(7, jasmine.any(Object));
  });
});
