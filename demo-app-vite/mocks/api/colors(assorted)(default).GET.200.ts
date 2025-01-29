export interface ColorAPI {
	name: string
	color: string
	stock: number
	is_new?: boolean
	discontinued?: boolean
}

let colors: ColorAPI[]
export default colors = [
	{
		name: 'Some new arrival',
		color: '#9C27B0',
		stock: 2500,
		is_new: true,
	},
	{
		name: 'Sold out new arrival',
		color: '#673AB7',
		stock: 0,
		is_new: true,
	},
	{
		name: 'Non-new and available',
		color: '#3F51B5',
		stock: 1800
	},
	{
		name: 'Super long color name for testing ellipsis when overflowing',
		color: '#2196F3',
		stock: 500
	},
	{
		name: 'Light blue',
		color: '#03A9F4',
		stock: 1800
	},
	{
		name: 'Cyan',
		color: '#00BCD4',
		stock: 1800
	},
	{
		name: 'Teal',
		color: '#009688',
		stock: 1800
	},
	{
		name: 'Green',
		color: '#4CAF50',
		stock: 1800
	},
	{
		name: 'Light green',
		color: '#8BC34A',
		stock: 1800
	},
	{
		name: 'Sold out non-new',
		color: '#CDDC39',
		stock: 0
	},
	{
		name: 'In-stock but discontinued',
		color: '#FFEB3B',
		stock: 20,
		discontinued: true,
	},
	{
		name: 'Sold out and discontinued',
		color: '#FFC107',
		stock: 0,
		discontinued: true
	},
	{
		name: 'Invalid color',
		color: 'invalid_color',
		stock: 10
	}
]
